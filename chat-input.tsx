"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Mic, MicOff, ImageIcon, Square, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (content: string, image?: string, userId?: string) => void
  onSendAudio?: (audioBlob: Blob, userId?: string) => void
  disabled?: boolean
  placeholder?: string
  userId?: string
}

export function ChatInput({ onSendMessage, onSendAudio, disabled, placeholder = "Message LifeLine Ai", userId }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || selectedImage) {
      onSendMessage(message.trim(), selectedImage || undefined, userId)
      setMessage("")
      setSelectedImage(null)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Check if MediaRecorder supports OGG format
      const options = { mimeType: 'audio/ogg; codecs=opus' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to webm if OGG is not supported
        options.mimeType = 'audio/webm; codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        await uploadAudio(audioBlob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true)
    
    try {
      if (onSendAudio) {
        await onSendAudio(audioBlob, userId)
        console.log('Audio recording sent successfully!')
      } else {
        throw new Error('Audio sending not configured')
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
      alert('Failed to send audio recording. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Selected"
              className="max-w-32 h-20 object-cover rounded-lg border border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2 p-3 border border-border rounded-2xl bg-background shadow-sm">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isRecording}
              className="h-8 w-8 p-0 hover:bg-muted rounded-lg"
              title="Attach"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base resize-none min-h-[24px]"
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceToggle}
              disabled={disabled || isUploading}
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted rounded-lg",
                isRecording && "text-red-500 bg-red-50 dark:bg-red-950",
                isUploading && "text-primary"
              )}
              title={isRecording ? "Stop recording" : isUploading ? "Uploading..." : "Start recording"}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="submit"
              disabled={disabled || (!message.trim() && !selectedImage) || isRecording || isUploading}
              className="h-8 w-8 p-0 rounded-lg bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}