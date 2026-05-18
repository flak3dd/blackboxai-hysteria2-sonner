/* ------------------------------------------------------------------ */
/*  Control Flow Flattening Obfuscation Module                         */
/* ------------------------------------------------------------------ */

import logger from "@/lib/logger"

/**
 * Flatten control flow by converting structured code into a
 * switch-based state machine with opaque predicates and dead
 * code blocks. Works on Go / Python / pseudo-code sources.
 */

/* ------------------------------------------------------------------ */
/*  Opaque predicate generation                                        */
/* ------------------------------------------------------------------ */

function generateOpaquePredicate(): string {
  const predicates = [
    // Always-true expressions
    "(7 * 13 + 1) % 7 == 1",
    "(1 << 3) - 8 == 0",
    "int32(0xDEAD) & 0 == 0",
    "len([]byte{}) == 0",
    "0xff >> 8 == 0",
    "(-1 + 1) == 0",
    "3*3 - 9 == 0",
    "0x10 & 0x0F == 0",
  ]
  return predicates[Math.floor(Math.random() * predicates.length)]
}

/* ------------------------------------------------------------------ */
/*  Dead code block generation                                         */
/* ------------------------------------------------------------------ */

function generateDeadCodeBlock(language: "go" | "python" | "generic"): string {
  const goDeadCode = [
    `  if ${generateOpaquePredicate()} {\n    _ = make([]byte, 0)\n    return\n  }`,
    `  if ${generateOpaquePredicate()} {\n    var _ struct{ x int }\n    return\n  }`,
    `  switch {\n  case ${generateOpaquePredicate()}:\n    break\n  default:\n    break\n  }`,
    `  for range []int{} {\n    break\n  }`,
  ]
  const pythonDeadCode = [
    `  if ${generateOpaquePredicate().replace("==", "==").replace("int32(", "int(")}:\n    pass`,
    `  if ${generateOpaquePredicate().replace("==", "==").replace("int32(", "int(")}:\n    _ = []\n    return`,
    `  while False:\n    break`,
    `  if 0:\n    pass`,
  ]
  const genericDeadCode = [
    `  if ${generateOpaquePredicate()} { /* dead */ }`,
    `  if ${generateOpaquePredicate()} { /* unreachable */ }`,
  ]

  switch (language) {
    case "go":
      return goDeadCode[Math.floor(Math.random() * goDeadCode.length)]
    case "python":
      return pythonDeadCode[Math.floor(Math.random() * pythonDeadCode.length)]
    default:
      return genericDeadCode[Math.floor(Math.random() * genericDeadCode.length)]
  }
}

/* ------------------------------------------------------------------ */
/*  State machine builder                                              */
/* ------------------------------------------------------------------ */

function buildStateMachine(
  statements: string[],
  level: "light" | "medium" | "heavy",
  language: "go" | "python" | "generic"
): string {
  // Assign each real statement a unique state number
  // Insert dead-code states between them
  const stateEntries: { state: number; code: string; isDead: boolean }[] = []
  let stateCounter = 0

  for (let i = 0; i < statements.length; i++) {
    // Add a dead-code block before each real statement (based on level)
    if (level !== "light" || i > 0) {
      stateEntries.push({
        state: stateCounter++,
        code: generateDeadCodeBlock(language),
        isDead: true,
      })
    }

    stateEntries.push({
      state: stateCounter++,
      code: statements[i],
      isDead: false,
    })

    // For heavy, add extra dead blocks after
    if (level === "heavy") {
      stateEntries.push({
        state: stateCounter++,
        code: generateDeadCodeBlock(language),
        isDead: true,
      })
    }
  }

  // Build the switch-based state machine
  const finalState = stateCounter
  const lines: string[] = []

  if (language === "go") {
    lines.push(`  _state := 0`)
    lines.push(`  for _state != ${finalState} {`)
    lines.push(`    switch _state {`)
    for (const entry of stateEntries) {
      lines.push(`    case ${entry.state}:`)
      lines.push(`      ${entry.code}`)
      if (entry.isDead) {
        lines.push(`      _state = _state + 1`)
      } else {
        // Find next non-dead state or final
        const nextIdx = stateEntries.indexOf(entry) + 1
        const nextEntry = nextIdx < stateEntries.length ? stateEntries[nextIdx] : null
        lines.push(`      _state = ${nextEntry ? nextEntry.state : finalState}`)
      }
    }
    lines.push(`    default:`)
    lines.push(`      _state = ${finalState}`)
    lines.push(`    }`)
    lines.push(`  }`)
  } else if (language === "python") {
    lines.push(`  _state = 0`)
    lines.push(`  while _state != ${finalState}:`)
    lines.push(`    if _state == ${stateEntries[0]?.state ?? 0}:`)
    for (let i = 0; i < stateEntries.length; i++) {
      const entry = stateEntries[i]
      if (i > 0) {
        lines.push(`    elif _state == ${entry.state}:`)
      }
      lines.push(`      ${entry.code}`)
      if (entry.isDead) {
        lines.push(`      _state = _state + 1`)
      } else {
        const nextIdx = i + 1
        const nextEntry = nextIdx < stateEntries.length ? stateEntries[nextIdx] : null
        lines.push(`      _state = ${nextEntry ? nextEntry.state : finalState}`)
      }
    }
    lines.push(`    else:`)
    lines.push(`      _state = ${finalState}`)
  } else {
    // Generic C-style
    lines.push(`  int _state = 0;`)
    lines.push(`  while (_state != ${finalState}) {`)
    lines.push(`    switch (_state) {`)
    for (const entry of stateEntries) {
      lines.push(`    case ${entry.state}:`)
      lines.push(`      ${entry.code}`)
      if (entry.isDead) {
        lines.push(`      _state = _state + 1; break;`)
      } else {
        const nextIdx = stateEntries.indexOf(entry) + 1
        const nextEntry = nextIdx < stateEntries.length ? stateEntries[nextIdx] : null
        lines.push(`      _state = ${nextEntry ? nextEntry.state : finalState}; break;`)
      }
    }
    lines.push(`    default:`)
    lines.push(`      _state = ${finalState}; break;`)
    lines.push(`    }`)
    lines.push(`  }`)
  }

  return lines.join("\n")
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Flatten control flow in the given source code.
 *
 * @param source - The source code to transform
 * @param level  - Obfuscation intensity
 * @returns Transformed source with flattened control flow
 */
export function flattenControlFlow(
  source: string,
  level: "light" | "medium" | "heavy"
): string {
  logger.debug({ level }, "Control flow flattening: starting")

  // Detect language heuristically
  const language: "go" | "python" | "generic" = detectLanguage(source)

  // Extract function bodies (simplified: split on function boundaries)
  const lines = source.split("\n")
  const output: string[] = []
  let inFunction = false
  let functionBuffer: string[] = []
  let braceDepth = 0

  for (const line of lines) {
    if (!inFunction) {
      // Detect function start
      if (
        (language === "go" && /^(func |func\()/.test(line.trim())) ||
        (language === "python" && /^def /.test(line.trim())) ||
        (language === "generic" && /^(void|int|bool|string|func|async|function)\s+\w+/.test(line.trim()))
      ) {
        inFunction = true
        functionBuffer = [line]
        braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
        if (language === "python") {
          // Python uses indentation, track indent level
          braceDepth = 1
        }
        continue
      }
      output.push(line)
    } else {
      functionBuffer.push(line)
      braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length

      // For Python, detect end of function by dedent
      const isPythonEnd = language === "python" && line.trim() === "" && functionBuffer.length > 3
      const isBraceEnd = braceDepth <= 0 && language !== "python"

      if (isBraceEnd || isPythonEnd) {
        // Process the collected function
        const funcSource = functionBuffer.join("\n")
        const flattened = flattenFunction(funcSource, level, language)
        output.push(flattened)
        inFunction = false
        functionBuffer = []
        braceDepth = 0
      }
    }
  }

  // Flush any remaining function buffer
  if (inFunction && functionBuffer.length > 0) {
    const funcSource = functionBuffer.join("\n")
    const flattened = flattenFunction(funcSource, level, language)
    output.push(flattened)
  }

  logger.debug("Control flow flattening: complete")
  return output.join("\n")
}

/**
 * Flatten a single function body
 */
function flattenFunction(
  funcSource: string,
  level: "light" | "medium" | "heavy",
  language: "go" | "python" | "generic"
): string {
  const lines = funcSource.split("\n")
  const header = lines[0] // function signature
  const body = lines.slice(1)

  // Split body into logical statements (simplified: one per line)
  const statements = body
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "{" && l !== "}")

  if (statements.length < 3) {
    // Too few statements to meaningfully flatten
    return funcSource
  }

  // Build the state machine
  const stateMachine = buildStateMachine(statements, level, language)

  return `${header}\n${stateMachine}\n${language === "go" || language === "generic" ? "}" : ""}`
}

/**
 * Detect source language from content heuristics
 */
function detectLanguage(source: string): "go" | "python" | "generic" {
  if (/^package\s+\w+/m.test(source) || /^import\s+\(/m.test(source)) {
    return "go"
  }
  if (/^import\s+/m.test(source) && !/^import\s*\(/m.test(source) && /def\s+\w+/.test(source)) {
    return "python"
  }
  if (/^def\s+\w+/m.test(source) || /^class\s+\w+/m.test(source)) {
    return "python"
  }
  return "generic"
}
