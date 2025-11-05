"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, Bot, Volume2, VolumeX } from "lucide-react"
import type { Message } from "@/app/page"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)

  const convertHtmlToPlainText = (input: string): string => {
    if (!input) return ""

    // Normalize some common HTML elements to plain text semantics first
    let normalized = input
      .replace(/<br\s*\/?\>/gi, "\n")
      .replace(/<\/(p|div)\s*>/gi, "\n\n")
      .replace(/<\/(h[1-6])\s*>/gi, "\n\n")
      .replace(/<li\s*>/gi, "- ")
      .replace(/<\/(li)\s*>/gi, "\n")
      .replace(/<\/(ul|ol)\s*>/gi, "\n")

    // Best-effort DOM-based extraction when running in the browser
    if (typeof window !== "undefined") {
      const container = document.createElement("div")
      container.innerHTML = normalized
      const text = container.textContent || container.innerText || ""
      return text
        .replace(/[\u00A0\u2007\u202F]/g, " ") // non-breaking spaces to regular
        .replace(/\n{3,}/g, "\n\n") // collapse excessive newlines
        .trim()
    }

    // Fallback on server: strip tags naïvely
    return normalized
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const plainTextContent = convertHtmlToPlainText(message.content)

  const handleAudioLoad = () => {
    setIsAudioLoading(false)
    setAudioError(false)
  }

  const handleAudioError = () => {
    setIsAudioLoading(false)
    setAudioError(true)
  }

  const handleAudioLoadStart = () => {
    setIsAudioLoading(true)
    setAudioError(false)
  }

  const retryAudio = () => {
    setAudioError(false)
    setIsAudioLoading(true)
    // Force reload by updating the src
    const audioElement = document.querySelector(`audio[data-message-id="${message.id}"]`) as HTMLAudioElement
    if (audioElement) {
      const currentSrc = audioElement.src
      audioElement.src = ''
      setTimeout(() => {
        audioElement.src = currentSrc
        audioElement.load() // Force reload
      }, 100)
    }
  }

  // Handle audio element events
  const handleAudioCanPlay = () => {
    setIsAudioLoading(false)
    setAudioError(false)
  }

  const handleTextToSpeech = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in your browser")
      return
    }

    if (isSpeaking) {
      // Stop current speech
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      // Start new speech
      const utterance = new SpeechSynthesisUtterance(plainTextContent)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-1">
          <span className="text-sm font-medium text-foreground">
            {isUser ? (message.userId ? `User ${message.userId}` : "You") : "Agam Puram"}
          </span>
        </div>

        {message.image && (
          <div className="mb-3">
            {message.content === "[Audio Recording]" || message.content === "[Audio Reply]" ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{message.content === "[Audio Reply]" ? "Audio Reply" : "Audio Recording"}</p>
                  <p className="text-xs text-muted-foreground">Click to play</p>
                </div>
                <div className="flex items-center gap-2">
                  <audio 
                    controls 
                    className="h-8"
                    data-message-id={message.id}
                    onLoadStart={handleAudioLoadStart}
                    onLoadedData={handleAudioLoad}
                    onCanPlay={handleAudioCanPlay}
                    onError={handleAudioError}
                    preload="metadata"
                  >
                    <source src={message.image} type="audio/mpeg" />
                    <source src={message.image} type="audio/ogg" />
                    <source src={message.image} type="audio/wav" />
                    <source src={message.image} type="audio/webm" />
                    Your browser does not support the audio element.
                  </audio>
                  
                  {isAudioLoading && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  )}
                  
                  {audioError && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">Failed to load audio</span>
                      <button
                        onClick={retryAudio}
                        className="text-xs text-primary hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <img
                src={message.image || "/placeholder.svg"}
                alt="Uploaded image"
                className="max-w-sm h-auto rounded-lg border border-border"
              />
            )}
          </div>
        )}

        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap mb-2">{plainTextContent}</div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTextToSpeech}
              className="h-6 w-6 p-0 hover:bg-muted"
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
