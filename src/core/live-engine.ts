import { SecurityEvent } from './types';

export interface DeveloperRule {
  id: string;
  name: string;
  type: 'sigma' | 'ebpf' | 'safetensors';
  description: string;
  expression: string;
  severity: 'critical' | 'high' | 'medium';
  enabled: boolean;
  matchesCount: number;
  lastMatched?: string;
}

export const INITIAL_DEVELOPER_RULES: DeveloperRule[] = [
  {
    id: 'RULE-SIGMA-01',
    name: 'Anomalous Safetensors Shard Egress Pattern',
    type: 'sigma',
    description: 'Detects outbound TLS streams where transfer chunk sizes match 70B model shard partitions (>500MB within 5s window).',
    expression: 'selection:\n  destination.port: [443, 8443]\n  bytes_out: > 500000000\n  process.name: "python3"\ncondition: selection',
    severity: 'critical',
    enabled: true,
    matchesCount: 14,
    lastMatched: '2 minutes ago',
  },
  {
    id: 'RULE-EBPF-02',
    name: 'Unauthorized ptrace Syscall on Inference Container',
    type: 'ebpf',
    description: 'Tetragon eBPF probe intercepting SYS_PTRACE attachments targeting GPU worker process namespaces.',
    expression: 'kprobe:sys_ptrace {\n  if (pid_in_container("inference-workers")) {\n    sigkill_process();\n    emit_alert("PTRACE_HOOK_BLOCKED");\n  }\n}',
    severity: 'high',
    enabled: true,
    matchesCount: 3,
    lastMatched: '15 minutes ago',
  },
  {
    id: 'RULE-TENSOR-03',
    name: 'Python Pickle Byte Injection in Safetensors Header',
    type: 'safetensors',
    description: 'Header parser verifying magic number (0x00000000) and rejecting raw pickle opcodes (cos, system, eval).',
    expression: 'inspect_tensor_header(bytes) {\n  assert bytes[0:8] != b"cos\\nsystem"\n  assert header_is_pure_json(bytes)\n}',
    severity: 'critical',
    enabled: true,
    matchesCount: 1,
    lastMatched: '1 hour ago',
  },
];

export interface ClusterResourceMetrics {
  gpuClusterUtilization: number; // percentage
  gpuVramUsedGb: number;
  gpuVramTotalGb: number;
  inferenceQueueDepth: number;
  grpcLatencyP99Ms: number;
  ingressBandwidthMbps: number;
  egressBandwidthMbps: number;
  activeContainersCount: number;
}

export const INITIAL_CLUSTER_METRICS: ClusterResourceMetrics = {
  gpuClusterUtilization: 76.4,
  gpuVramUsedGb: 612.8,
  gpuVramTotalGb: 800.0,
  inferenceQueueDepth: 18,
  grpcLatencyP99Ms: 42.1,
  ingressBandwidthMbps: 1420.5,
  egressBandwidthMbps: 88.2,
  activeContainersCount: 24,
};
