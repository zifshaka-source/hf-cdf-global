import satReconImg from '../assets/images/satellite_recon_compound_1794028080968.jpg';
import flirPerimeterImg from '../assets/images/thermal_flir_perimeter_1794028094621.jpg';
import vaultInterlockImg from '../assets/images/vault_interlock_gate_1794028110457.jpg';
import fiberLandingImg from '../assets/images/quantum_fiber_landing_1794028126861.jpg';
import cyberCommandEnvImg from '../assets/images/cyber_command_environment_1793863607258.jpg';
import networkTopologyImg from '../assets/images/network_threat_topology_1793863607029.jpg';
import aiSwarmCoreImg from '../assets/images/ai_agent_swarm_core_1793863606795.jpg';
import cyberAgentPortraitImg from '../assets/images/cyber_agent_portrait_1794163023777.jpg';
import sentinelPortraitImg from '../assets/images/sentinel_agent_portrait_1794163037608.jpg';

export const SURVEILLANCE_FEED_IMAGES = {
  sat: satReconImg,
  flir: flirPerimeterImg,
  vault: vaultInterlockImg,
  fiber: fiberLandingImg,
} as const;

export const PLATFORM_MEDIA_ASSETS = {
  ...SURVEILLANCE_FEED_IMAGES,
  cyberCommandEnv: cyberCommandEnvImg,
  networkTopology: networkTopologyImg,
  aiSwarmCore: aiSwarmCoreImg,
  cyberAgentPortrait: cyberAgentPortraitImg,
  sentinelPortrait: sentinelPortraitImg,
} as const;
