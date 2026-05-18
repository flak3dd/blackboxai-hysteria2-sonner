import type {
  HysteriaOnlineMap,
  HysteriaStreamDump,
  HysteriaTrafficMap,
} from "@/lib/hysteria/types"
import { getTrafficStatsCollector } from "@/lib/infrastructure/traffic-stats"
import logger from "@/lib/logger"

const trafficLogger = logger.child({ module: 'traffic' })

export async function fetchTraffic(clear = false): Promise<HysteriaTrafficMap> {
  try {
    const collector = getTrafficStatsCollector()
    const stats = await collector.fetchTraffic(clear)
    
    // Convert to legacy format
    const legacy: HysteriaTrafficMap = {}
    for (const [key, value] of Object.entries(stats)) {
      legacy[key] = { tx: value.tx, rx: value.rx }
    }
    
    return legacy
  } catch (error) {
    trafficLogger.error(`Failed to fetch traffic: ${error}`)
    return {}
  }
}

export async function fetchOnline(): Promise<HysteriaOnlineMap> {
  try {
    const collector = getTrafficStatsCollector()
    const stats = await collector.fetchOnline()
    return stats
  } catch (error) {
    trafficLogger.error(`Failed to fetch online: ${error}`)
    return {}
  }
}

export async function kickUsers(ids: string[]): Promise<void> {
  try {
    const collector = getTrafficStatsCollector()
    // Note: Kick functionality would need to be implemented in the Hysteria2 API
    trafficLogger.warn(`Kick users called for: ${ids.join(', ')} - not yet implemented in API`)
    await new Promise(resolve => setTimeout(resolve, 200))
  } catch (error) {
    trafficLogger.error(`Failed to kick users: ${error}`)
  }
}

export async function dumpStreams(): Promise<HysteriaStreamDump> {
  try {
    const collector = getTrafficStatsCollector()
    const streams = await collector.fetchStreams()
    
    return {
      streams: streams.map(s => ({
        state: s.state,
        auth: s.auth,
        connection: s.connection,
        stream: s.stream,
        req_addr: s.req_addr,
        hooked_req_addr: s.hooked_req_addr,
        tx: s.tx,
        rx: s.rx,
        initial_at: s.initial_at,
        last_active_at: s.last_active_at
      }))
    }
  } catch (error) {
    trafficLogger.error(`Failed to dump streams: ${error}`)
    return { streams: [] }
  }
}
