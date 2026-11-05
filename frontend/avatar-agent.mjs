import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { cli, defineAgent, inference, ServerOptions, voice } from '@livekit/agents';
import { RoomEvent } from '@livekit/rtc-node';
import { AvatarSession } from '@livekit/agents-plugin-synthesia';
import { configuredAvatars, DEFAULT_AVATAR_KEY } from './src/features/simulation/avatar-catalog.mjs';

// URL.pathname은 Windows에서 /C:/... 가 되어 dotenv가 파일을 못 찾는다(quiet라 오류도 안 보인다).
config({ path: fileURLToPath(new URL('../backend/.env', import.meta.url)), quiet: true });

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();
    // 사용자가 연결 중 나가더라도 아바타가 방에 남아 사용량과 동시 접속 한도를 점유하지 않게 한다.
    let userLeft = false;
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity.startsWith('user-')) {
        userLeft = true;
        void ctx.room.disconnect();
        ctx.shutdown('participant left');
      }
    });
    const participant = await Promise.race([
      ctx.waitForParticipant(),
      new Promise((resolve) => setTimeout(() => resolve(null), 15000)),
    ]);
    if (!participant || !participant.identity.startsWith('user-') || userLeft) {
      await ctx.room.disconnect();
      ctx.shutdown('no participant');
      return;
    }
    // 토큰 라우트가 고른 아바타 key를 작업 메타데이터로 넘긴다. 실제 ID는 이 워커의 환경 변수에서만 찾는다.
    let requested = DEFAULT_AVATAR_KEY;
    try { requested = JSON.parse(ctx.job.metadata || '{}').avatar ?? DEFAULT_AVATAR_KEY; } catch {}
    const choice = configuredAvatars(process.env).get(requested);
    if (!choice) {
      await ctx.room.localParticipant.publishData(new TextEncoder().encode('unknown_avatar'), { topic: 'onestep.avatar.error', reliable: true }).catch(() => {});
      await ctx.room.disconnect();
      ctx.shutdown('avatar not configured');
      return;
    }
    const session = new voice.AgentSession({
      tts: new inference.TTS({ model: 'cartesia/sonic-3', voice: choice.voice, language: 'ko' }),
    });
    const avatar = new AvatarSession({ avatarIds: [choice.avatarId] }, { joinTimeout: 60000 });
    try {
      await avatar.start(session, ctx.room);
    } catch (error) {
      const allowed = new Set(['auth', 'feature_not_in_plan', 'invalid_room_token', 'livekit_credentials_rejected', 'invalid_session_request', 'unknown_avatar', 'quota_exceeded', 'rate_limited', 'concurrency_limit', 'timeout', 'connection']);
      const reason = allowed.has(error?.type) ? error.type : 'connection';
      if (!userLeft) await ctx.room.localParticipant.publishData(new TextEncoder().encode(reason), { topic: 'onestep.avatar.error', reliable: true }).catch(() => {});
      await ctx.room.disconnect();
      ctx.shutdown('avatar unavailable');
      return;
    }
    await session.start({
      agent: new voice.Agent({ instructions: 'Speak only the supplied text.' }),
      room: ctx.room,
      record: { audio: false, transcript: false, traces: false, logs: false, redaction: true },
      inputOptions: {
        audioEnabled: false,
        textInputCallback: (current, event) => {
          if (event.text && event.text.length <= 1000) current.say(event.text, { addToChatCtx: false });
        },
      },
      outputOptions: { transcriptionEnabled: false },
    });
    await ctx.room.localParticipant.publishData(new TextEncoder().encode('ready'), { topic: 'onestep.avatar.ready', reliable: true });
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: 'onestep-avatar', host: '127.0.0.1' }));
