import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { cli, defineAgent, inference, ServerOptions, voice } from '@livekit/agents';
import { RoomEvent } from '@livekit/rtc-node';
import { AvatarSession } from '@livekit/agents-plugin-synthesia';

config({ path: new URL('../backend/.env', import.meta.url).pathname, quiet: true });

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
    const session = new voice.AgentSession({
      tts: new inference.TTS({
        model: 'cartesia/sonic-3',
        voice: process.env.AVATAR_TTS_VOICE || 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',
        language: 'ko',
      }),
    });
    const avatar = new AvatarSession({ avatarIds: [process.env.SYNTHESIA_AVATAR_ID] }, { joinTimeout: 60000 });
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
