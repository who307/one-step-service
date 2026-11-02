"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import type { AvatarConnection } from "@/types/api";

type Status = "connecting" | "ready" | "failed";

export function useVideoAvatar(enabled: boolean) {
  const [status, setStatus] = useState<Status>("connecting");
  const [failure, setFailure] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = useRef<RemoteTrack | null>(null);
  const audioTrack = useRef<RemoteTrack | null>(null);
  const roomRef = useRef<Room | null>(null);
  const readyRef = useRef(false);
  const pending = useRef<string[]>([]);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && videoTrack.current) videoTrack.current.attach(element);
  }, []);
  const setAudioElement = useCallback((element: HTMLAudioElement | null) => {
    audioRef.current = element;
    if (element && audioTrack.current) audioTrack.current.attach(element);
  }, []);

  const speak = useCallback((text: string) => {
    const room = roomRef.current;
    if (!room || !readyRef.current) { pending.current.push(text); return; }
    void room.localParticipant.sendText(text, { topic: "lk.chat" }).catch(() => setStatus("failed"));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;
    const timer = window.setTimeout(() => { if (!readyRef.current) { setStatus("failed"); void room.disconnect(); } }, 90000);
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (participant.identity !== "synthesia-avatar-agent") return;
      if (track.kind === Track.Kind.Video) { videoTrack.current = track; if (videoRef.current) track.attach(videoRef.current); }
      if (track.kind === Track.Kind.Audio) { audioTrack.current = track; if (audioRef.current) track.attach(audioRef.current); }
    });
    room.on(RoomEvent.DataReceived, (data, participant, _kind, topic) => {
      if (topic === "onestep.avatar.error" && participant && participant.identity !== "synthesia-avatar-agent") {
        const code = new TextDecoder().decode(data);
        if (["auth", "feature_not_in_plan", "invalid_room_token", "livekit_credentials_rejected", "invalid_session_request", "unknown_avatar", "quota_exceeded", "rate_limited", "concurrency_limit", "timeout", "connection"].includes(code)) setFailure(code);
        setStatus("failed");
        void room.disconnect();
        return;
      }
      if (topic !== "onestep.avatar.ready" || !participant || participant.identity === "synthesia-avatar-agent") return;
      readyRef.current = true;
      setStatus("ready");
      for (const text of pending.current.splice(0)) {
        void room.localParticipant.sendText(text, { topic: "lk.chat" }).catch(() => setStatus("failed"));
      }
    });
    room.on(RoomEvent.Disconnected, () => { if (!cancelled) setStatus("failed"); });
    void (async () => {
      try {
        const response = await fetch("/api/avatar", { method: "POST" });
        if (!response.ok) throw new Error("avatar unavailable");
        const { url, token } = await response.json() as AvatarConnection;
        if (!cancelled) {
          await room.connect(url, token);
          if (cancelled) await room.disconnect();
        }
      } catch { if (!cancelled) setStatus("failed"); }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      pending.current = [];
      videoTrack.current?.detach();
      audioTrack.current?.detach();
      videoTrack.current = null;
      audioTrack.current = null;
      window.clearTimeout(timer);
      void room.disconnect();
      roomRef.current = null;
    };
  }, [enabled]);

  const playAudio = useCallback(() => { void audioRef.current?.play(); }, []);
  const setMuted = useCallback((muted: boolean) => { if (audioRef.current) audioRef.current.muted = muted; }, []);
  return { status, failure, setVideoElement, setAudioElement, playAudio, setMuted, speak };
}
