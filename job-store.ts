type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface JobRecord {
  id: string
  status: JobStatus
  createdAt: number
  updatedAt: number
  error?: string
  responseText?: string
  responseType?: string
  responseBinaryBase64?: string
}

const jobs = new Map<string, JobRecord>()

// Add a simple persistence check
let storeInitialized = false
if (!storeInitialized) {
  console.log('Job store initialized')
  storeInitialized = true
}

// Debug function to log all jobs
export function debugJobs() {
  console.log('=== JOB STORE DEBUG ===')
  console.log('Total jobs:', jobs.size)
  for (const [id, job] of jobs.entries()) {
    console.log(`Job ${id}:`, {
      status: job.status,
      hasAudioData: !!job.responseBinaryBase64,
      responseType: job.responseType,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt).toISOString()
    })
  }
  console.log('=== END DEBUG ===')
}

export function createJob(): JobRecord {
  const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8)
  const now = Date.now()
  const job: JobRecord = { id, status: 'pending', createdAt: now, updatedAt: now }
  jobs.set(id, job)
  console.log('Created new job:', id)
  console.log('Total jobs after creation:', jobs.size)
  return job
}

export function getJob(jobId: string): JobRecord | undefined {
  const job = jobs.get(jobId)
  console.log('getJob called with:', jobId)
  console.log('Job found:', !!job)
  console.log('Total jobs in store:', jobs.size)
  console.log('All job IDs:', Array.from(jobs.keys()))
  return job
}

export function updateJob(jobId: string, update: Partial<JobRecord>): JobRecord | undefined {
  const existing = jobs.get(jobId)
  console.log('updateJob called with:', jobId, 'update:', Object.keys(update))
  console.log('Existing job found:', !!existing)
  
  if (!existing) {
    console.log('No existing job found for update')
    return undefined
  }
  
  const next = { ...existing, ...update, updatedAt: Date.now() }
  jobs.set(jobId, next)
  console.log('Job updated successfully')
  return next
}

export function removeOldJobs(maxAgeMs = 1000 * 60 * 30): void {
  const now = Date.now()
  console.log('removeOldJobs called, maxAgeMs:', maxAgeMs)
  let removedCount = 0
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > maxAgeMs) {
      jobs.delete(id)
      removedCount++
    }
  }
  console.log('Removed', removedCount, 'old jobs')
}


