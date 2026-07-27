import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/lib/auth-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8070';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

/**
 * Opens a live push connection for chat (Conversations + Communication) and
 * invalidates the relevant React Query caches as events arrive, so open
 * threads update within a fraction of a second instead of waiting on a poll.
 * Reconnects with backoff on drop; callers should still keep a short
 * `refetchInterval` on their queries as a safety net in case the socket
 * never connects (e.g. a reverse proxy that doesn't pass through the
 * WebSocket Upgrade handshake) — this hook is a speed boost, not the only
 * way data arrives.
 */
export default function useLiveChat(onEvent) {
  const queryClient = useQueryClient();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      const token = getToken();
      if (!token || stopped) return;

      socket = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}`);

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type === 'message') {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if (payload.conversation_id) {
            queryClient.invalidateQueries({ queryKey: ['messages', payload.conversation_id] });
          }
        } else if (payload.type === 'conversation') {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } else if (payload.type === 'communication' && payload.client_id) {
          queryClient.invalidateQueries({ queryKey: ['communications', payload.client_id] });
        }
        onEventRef.current?.(payload);
      };

      socket.onclose = () => {
        if (stopped) return;
        attempt += 1;
        const delay = Math.min(30000, 1000 * 2 ** (attempt - 1));
        reconnectTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient]);
}
