export type CallSignalType = "offer" | "answer" | "ice";

export interface CallMediaState {
  audio: boolean;
  camera: boolean;
  screen: boolean;
}

export interface CallSignalPayload {
  gameId: string;
  to: string;
  from?: string;
  toClientId?: string;
  fromClientId?: string;
  fromPlatform?: string;
  type: CallSignalType;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export function callPeerId(username: string, clientId = "") {
  const user = String(username || "").trim().toLowerCase();
  const client = String(clientId || "").trim();
  return client ? `${user}#${client}` : user;
}

export function callPeerUsername(peerId: string) {
  return String(peerId || "").split("#", 1)[0].trim().toLowerCase();
}

export function callPeerClientId(peerId: string) {
  const raw = String(peerId || "");
  const index = raw.indexOf("#");
  return index >= 0 ? raw.slice(index + 1) : "";
}

export interface RemoteCallMedia {
  stream: MediaStream;
  media: CallMediaState;
}

export const EMPTY_CALL_MEDIA: CallMediaState = {
  audio: false,
  camera: false,
  screen: false
};

export function normalizeCallMedia(value: Partial<CallMediaState> | null | undefined): CallMediaState {
  return {
    audio: Boolean(value?.audio),
    camera: Boolean(value?.camera),
    screen: Boolean(value?.screen)
  };
}
