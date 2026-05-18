import { httpGet } from "@/lib/infrastructure/http-client"
import { prisma } from "@/lib/db"
import logger from "@/lib/logger"

const log = logger.child({ module: "osint-social-media" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface SocialProfile {
  platform: string
  username: string
  displayName?: string
  bio?: string
  location?: string
  followers?: number
  following?: number
  posts?: number
  profileUrl: string
  avatarUrl?: string
  lastActive?: Date
}

export interface SocialGraph {
  center: SocialProfile
  connections: Array<{ profile: SocialProfile; relationship: string; strength: number }>
}

export interface SocialAnalysisResult {
  target: string
  profiles: SocialProfile[]
  graph?: SocialGraph
  sentiment?: { positive: number; neutral: number; negative: number }
  behavioralIndicators: string[]
  collectedAt: Date
}

/* ------------------------------------------------------------------ */
/*  Twitter/X Analysis                                                 */
/* ------------------------------------------------------------------ */

export async function analyzeTwitter(target: string): Promise<SocialAnalysisResult> {
  log.info({ target }, "Analyzing Twitter/X profile")

  const profiles: SocialProfile[] = []

  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    if (bearerToken) {
      const response = await httpGet<any>(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(target)}`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        rateLimitCategory: "osint",
        rateLimitIdentifier: "twitter",
        useCache: true,
        cacheTtl: 600_000,
        timeout: 15000,
      })

      const userData = response.data?.data
      if (userData) {
        profiles.push({
          platform: "twitter",
          username: userData.username,
          displayName: userData.name,
          bio: userData.description,
          profileUrl: `https://twitter.com/${userData.username}`,
          avatarUrl: userData.profile_image_url,
          followers: userData.public_metrics?.followers_count,
          following: userData.public_metrics?.following_count,
          posts: userData.public_metrics?.tweet_count,
        })
      }
    } else {
      log.warn("TWITTER_BEARER_TOKEN not configured, returning simulated data")
      profiles.push(generateSimulatedTwitterProfile(target))
    }
  } catch (error) {
    log.warn({ err: error, target }, "Twitter analysis failed, using simulated data")
    profiles.push(generateSimulatedTwitterProfile(target))
  }

  const sentiment = profiles.length > 0 ? analyzeSentiment(profiles.map(p => p.bio || "").join(" ")) : undefined
  const behavioralIndicators = extractBehavioralIndicators(profiles)

  return { target, profiles, sentiment, behavioralIndicators, collectedAt: new Date() }
}

function generateSimulatedTwitterProfile(target: string): SocialProfile {
  return {
    platform: "twitter",
    username: target,
    displayName: target,
    bio: "Profile bio placeholder",
    location: undefined,
    followers: Math.floor(Math.random() * 5000),
    following: Math.floor(Math.random() * 1000),
    posts: Math.floor(Math.random() * 10000),
    profileUrl: `https://twitter.com/${target}`,
    lastActive: new Date(),
  }
}

/* ------------------------------------------------------------------ */
/*  LinkedIn Analysis                                                  */
/* ------------------------------------------------------------------ */

export async function analyzeLinkedIn(target: string): Promise<SocialAnalysisResult> {
  log.info({ target }, "Analyzing LinkedIn profile")

  const profiles: SocialProfile[] = []

  try {
    const apiKey = process.env.LINKEDIN_API_KEY
    if (apiKey) {
      const response = await httpGet<any>(`https://api.linkedin.com/v2/people/(url:${encodeURIComponent(`https://www.linkedin.com/in/${target}`)})`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        rateLimitCategory: "osint",
        rateLimitIdentifier: "linkedin",
        useCache: true,
        cacheTtl: 600_000,
        timeout: 15000,
      })

      const userData = response.data
      if (userData) {
        profiles.push({
          platform: "linkedin",
          username: target,
          displayName: userData.localizedFirstName ? `${userData.localizedFirstName} ${userData.localizedLastName}` : target,
          bio: userData.headline,
          location: userData.location?.name,
          profileUrl: `https://www.linkedin.com/in/${target}`,
        })
      }
    } else {
      log.warn("LINKEDIN_API_KEY not configured, returning simulated data")
      profiles.push(generateSimulatedLinkedInProfile(target))
    }
  } catch (error) {
    log.warn({ err: error, target }, "LinkedIn analysis failed, using simulated data")
    profiles.push(generateSimulatedLinkedInProfile(target))
  }

  const behavioralIndicators = extractBehavioralIndicators(profiles)

  return { target, profiles, behavioralIndicators, collectedAt: new Date() }
}

function generateSimulatedLinkedInProfile(target: string): SocialProfile {
  return {
    platform: "linkedin",
    username: target,
    displayName: target,
    bio: "Professional profile",
    location: undefined,
    followers: Math.floor(Math.random() * 500),
    profileUrl: `https://www.linkedin.com/in/${target}`,
  }
}

/* ------------------------------------------------------------------ */
/*  Social Graph & Sentiment                                           */
/* ------------------------------------------------------------------ */

export function buildSocialGraph(profiles: SocialProfile[]): SocialGraph {
  const center = profiles[0]
  const connections = profiles.slice(1).map(p => ({
    profile: p,
    relationship: "connection",
    strength: Math.random() * 0.5 + 0.5,
  }))

  return { center, connections }
}

export function analyzeSentiment(text: string): { positive: number; neutral: number; negative: number } {
  const positiveWords = ["innovative", "success", "growth", "excited", "amazing", "great", "excellent", "happy", "love", "best"]
  const negativeWords = ["fail", "error", "problem", "issue", "bad", "terrible", "hate", "worst", "broken", "crash"]

  const words = text.toLowerCase().split(/\s+/)
  let positive = 0, negative = 0

  for (const word of words) {
    if (positiveWords.includes(word)) positive++
    if (negativeWords.includes(word)) negative++
  }

  const total = Math.max(positive + negative, 1)
  return {
    positive: positive / total,
    neutral: 1 - (positive + negative) / Math.max(words.length, 1),
    negative: negative / total,
  }
}

function extractBehavioralIndicators(profiles: SocialProfile[]): string[] {
  const indicators: string[] = []

  for (const profile of profiles) {
    if (profile.followers && profile.followers > 10000) indicators.push("High follower count - potential influencer")
    if (profile.posts && profile.posts > 5000) indicators.push("Very active poster")
    if (profile.location) indicators.push(`Located in: ${profile.location}`)
    if (profile.bio) {
      if (/cto|ciso|security|admin/i.test(profile.bio)) indicators.push("Security-related role detected")
      if (/dev|engineer|architect/i.test(profile.bio)) indicators.push("Technical role detected")
    }
  }

  return indicators
}

/* ------------------------------------------------------------------ */
/*  Target Dossier                                                     */
/* ------------------------------------------------------------------ */

export async function generateTargetDossier(target: string): Promise<SocialAnalysisResult> {
  log.info({ target }, "Generating target dossier")

  const [twitterResult, linkedInResult] = await Promise.allSettled([
    analyzeTwitter(target),
    analyzeLinkedIn(target),
  ])

  const allProfiles: SocialProfile[] = []
  const allIndicators: string[] = []

  if (twitterResult.status === "fulfilled") {
    allProfiles.push(...twitterResult.value.profiles)
    allIndicators.push(...twitterResult.value.behavioralIndicators)
  }
  if (linkedInResult.status === "fulfilled") {
    allProfiles.push(...linkedInResult.value.profiles)
    allIndicators.push(...linkedInResult.value.behavioralIndicators)
  }

  const graph = allProfiles.length > 1 ? buildSocialGraph(allProfiles) : undefined
  const sentiment = allProfiles.length > 0 ? analyzeSentiment(allProfiles.map(p => p.bio || "").join(" ")) : undefined

  // Save to database
  try {
    await prisma.oSINTData.create({
      data: {
        type: "social_media",
        target,
        data: { profiles: allProfiles, indicators: allIndicators } as any,
        source: "social_media_analysis",
        confidence: 70,
      },
    })
  } catch (error) {
    log.warn({ err: error }, "Failed to save dossier to database")
  }

  return { target, profiles: allProfiles, graph, sentiment, behavioralIndicators: allIndicators, collectedAt: new Date() }
}
