export const NBODY_WGSL = String.raw`
// WGSL compute kernel sketch for pairwise N-body acceleration.
// Buffer layout note:
// - Positions and masses are packed as vec4<f32> to preserve 16-byte alignment.
// - The render thread reads the same buffer shape for seamless interop.
struct Body {
  positionMass: vec4<f32>,
  velocityRadius: vec4<f32>,
};

struct Params {
  count: u32,
  _pad0: vec3<u32>,
  G: f32,
  softening: f32,
  dt: f32,
  _pad1: f32,
};

@group(0) @binding(0) var<storage, read> inputBodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> outputBodies: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= params.count) { return; }
  let self = inputBodies[id.x];
  var ax: f32 = 0.0;
  var ay: f32 = 0.0;
  for (var j: u32 = 0u; j < params.count; j = j + 1u) {
    if (j == id.x) { continue; }
    let other = inputBodies[j];
    let dx = other.positionMass.x - self.positionMass.x;
    let dy = other.positionMass.y - self.positionMass.y;
    let r2 = dx * dx + dy * dy + params.softening * params.softening;
    let invR = inverseSqrt(r2);
    let scale = params.G * other.positionMass.w * invR * invR * invR;
    ax = ax + scale * dx;
    ay = ay + scale * dy;
  }
  var outBody = self;
  outBody.velocityRadius.x = self.velocityRadius.x + ax * params.dt;
  outBody.velocityRadius.y = self.velocityRadius.y + ay * params.dt;
  outBody.positionMass.x = self.positionMass.x + outBody.velocityRadius.x * params.dt;
  outBody.positionMass.y = self.positionMass.y + outBody.velocityRadius.y * params.dt;
  outputBodies[id.x] = outBody;
}
`;

function canTryWebGPU() {
  return typeof navigator !== 'undefined' && !!navigator.gpu && typeof isSecureContext === 'boolean' && isSecureContext;
}

export async function bootstrapAccelerationBackend() {
  if (!canTryWebGPU()) {
    return { kind: 'wasm', reason: 'webgpu_unavailable_or_insecure_context', device: null };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { kind: 'wasm', reason: 'no_adapter', device: null };
    }
    try {
      const device = await adapter.requestDevice();
      return { kind: 'webgpu', reason: 'adapter_and_device_ready', adapter, device, shader: NBODY_WGSL };
    } catch (deviceError) {
      return { kind: 'wasm', reason: `device_request_failed:${deviceError instanceof Error ? deviceError.message : 'unknown'}`, device: null };
    }
  } catch (adapterError) {
    return { kind: 'wasm', reason: `adapter_request_failed:${adapterError instanceof Error ? adapterError.message : 'unknown'}`, device: null };
  }
}
