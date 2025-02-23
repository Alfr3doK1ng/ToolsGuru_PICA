"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useAuthKit } from "@picahq/authkit";
import { Header } from "./components/Header";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";

export default function Home() {

  const [showButton, setShowButton] = useState(false);
 

  const {
    messages,
    handleSubmit,
    input,
    handleInputChange,
    append,
    isLoading,
    stop,
    status,
  } = useChat({
    maxSteps: 20,

    async onToolCall({toolCall}) {
      if (toolCall.toolName === "showButton") {
        setShowButton(true);
        return {
          message: "Button shown",
        }
      }
    },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add new useEffect to focus after loading completes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <div className="flex flex-col justify-between h-dvh">
      <div className="flex flex-col h-full">
        <Header />
        <ChatMessages messages={messages} isLoading={isLoading} />
        {showButton && <button onClick={() => setShowButton(false)}>Show Button</button>}
        <ChatInput
          inputRef={inputRef}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          status={status}
          stop={stop}
          messages={messages}
          append={append}
        />
      </div>
    </div>
  );
}
