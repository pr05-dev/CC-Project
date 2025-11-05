import { NextRequest, NextResponse } from "next/server"
import { createJob, updateJob } from "@/lib/job-store"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const sessionId = (formData.get('sessionId') as string) || ''
    const userId = (formData.get('userId') as string) || ''
    const phone = (formData.get('phone') as string) || ''
    const webhookUrl = (formData.get('webhookUrl') as string) || ''

    if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })

    const job = createJob()
    const origin = new URL(request.url).origin

    ;(async () => {
      try {
        const resolved = webhookUrl || process.env.WEBHOOK_URL
        if (!resolved) throw new Error('Webhook URL not configured')

        const forward = new FormData()
        forward.append('audio', new Blob([await audio.arrayBuffer()], { type: audio.type || 'audio/ogg' }), 'recording.ogg')
        forward.append('sessionId', sessionId)
        forward.append('userId', userId)
        forward.append('phone', phone)
        forward.append('msg_type', 'audio')
        forward.append('jobId', job.id)
        forward.append('callbackUrl', `${origin}/api/jobs/${job.id}/complete`)

        const res = await fetch(resolved, { method: 'POST', body: forward })
        const rawType = res.headers.get('content-type') || ''
        const contentType = rawType.toLowerCase()
        
        console.log('Webhook response status:', res.status)
        console.log('Webhook response content-type:', rawType)
        console.log('Webhook response headers:', Object.fromEntries(res.headers.entries()))
        
        if (contentType.startsWith('audio/') || contentType === 'application/octet-stream') {
          const buf = await res.arrayBuffer()
          const b64 = Buffer.from(buf).toString('base64')
          const finalType = contentType === 'application/octet-stream' ? 'audio/mpeg' : (rawType || 'audio/mpeg')
          updateJob(job.id, { status: 'completed', responseType: finalType, responseBinaryBase64: b64 })
        } else {
          const text = await res.text()
          console.log('Webhook response text (first 200 chars):', text.substring(0, 200))
          
          if (!res.ok) throw new Error(text || `Webhook status ${res.status}`)

          // Support base64 audio returned inside JSON
          let didHandleAsAudio = false
          try {
            const parsed = JSON.parse(text)
            console.log('Parsed webhook response:', Object.keys(parsed))
            
            const audioB64Candidate = parsed?.audioBase64 || parsed?.audio_b64 || parsed?.audio_base64 || parsed?.audio || parsed?.data || parsed?.responseBinaryBase64
            const declaredType: string | undefined = parsed?.mimeType || parsed?.contentType || parsed?.responseType

            console.log('Audio candidate found:', !!audioB64Candidate)
            console.log('Declared type:', declaredType)

            if (typeof audioB64Candidate === 'string') {
              if (audioB64Candidate.startsWith('data:')) {
                const match = audioB64Candidate.match(/^data:([^;]+);base64,(.+)$/)
                if (match) {
                  const [, mime, b64] = match
                  updateJob(job.id, { status: 'completed', responseType: mime || 'audio/mpeg', responseBinaryBase64: b64 })
                  didHandleAsAudio = true
                }
              } else {
                const finalType = (declaredType && typeof declaredType === 'string' ? declaredType : 'audio/mpeg')
                updateJob(job.id, { status: 'completed', responseType: finalType, responseBinaryBase64: audioB64Candidate })
                didHandleAsAudio = true
              }
            }
          } catch {}

          if (!didHandleAsAudio) {
            console.log('No audio data found in response, treating as text')
            updateJob(job.id, { status: 'completed', responseText: text, responseType: rawType })
          }
        }
      } catch (err: any) {
        updateJob(job.id, { status: 'failed', error: err?.message || 'unknown error' })
      }
    })()

    return NextResponse.json({ jobId: job.id }, { status: 202 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'bad request' }, { status: 400 })
  }
}


