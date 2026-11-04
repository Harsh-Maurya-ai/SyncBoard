import { useCallback, useEffect, useRef, useState } from "react";
import {
  emitChatMessage,
  listenForChatHistory,
  listenForChatMessage,
} from "../socket/socketClient";

const MAX_KEPT = 200; // messages kept in the browser

// Holds the chat state of one board: messages, unread counter, send function
export default function useChat({ myUserId, isOpen }) {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);

  // Refs so the socket listeners always see the latest values
  const isOpenRef = useRef(isOpen);
  const myUserIdRef = useRef(myUserId);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setUnread(0); // opening the panel marks everything as read
  }, [isOpen]);

  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  useEffect(() => {
    // History replaces the list (also correct after a reconnect: no duplicates)
    const stopHistory = listenForChatHistory((history) => {
      setMessages(Array.isArray(history) ? history : []);
    });

    const stopMessage = listenForChatMessage((message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id)
          ? prev
          : [...prev, message].slice(-MAX_KEPT)
      );
      if (!isOpenRef.current && message.userId !== myUserIdRef.current) {
        setUnread((n) => n + 1);
      }
    });

    return () => {
      stopHistory();
      stopMessage();
    };
  }, []);

  const sendMessage = useCallback((text) => emitChatMessage(text), []);

  return { messages, unread, sendMessage };
}