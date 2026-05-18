// =============================================================================
// Async Job Queue for Long-running MiniMax Tasks
// Stores job state and polls MiniMax until completion
// =============================================================================

const axios = require('axios');

// In-memory job store (resets on server restart — fine for MVP)
// Key: jobId, Value: { status, result, error, createdAt }
const jobs = new Map();

// Auto-cleanup old jobs every 30 min
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

function createJob() {
  const jobId = `bh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { status: 'pending', result: null, error: null, createdAt: Date.now() });
  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) Object.assign(job, updates);
}

/**
 * Poll a MiniMax async job until complete (or timeout after 5 min)
 * Returns the final result or throws
 */
async function pollMiniMaxJob(jobId, type = 'video') {
  const base = process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1';
  const key = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(groupId && { 'GroupId': groupId }),
  };

  const endpoint = type === 'video'
    ? `${base}/video_generation`
    : `${base}/music_generation`;

  const maxWait = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 5000; // 5 seconds
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      // MiniMax async jobs use GET with job_id param to check status
      const resp = await axios.get(endpoint, {
        params: { job_id: jobId },
        headers,
        timeout: 15000,
      });

      const data = resp.data;

      // Job done
      if (data.status === 'success' || data.status === 'completed') {
        updateJob(jobId, { status: 'done', result: data });
        return data;
      }

      // Job failed
      if (data.status === 'failed' || data.error) {
        updateJob(jobId, { status: 'failed', error: data.error || 'Job failed' });
        return null;
      }

      // Still processing — wait and retry
      await sleep(pollInterval);
    } catch (err) {
      // On poll error, wait and retry once
      console.error(`[JOB POLL ERROR] ${jobId}:`, err.message);
      await sleep(pollInterval * 2);
    }
  }

  // Timeout
  updateJob(jobId, { status: 'timeout', error: 'Job timed out after 5 minutes' });
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createJob, getJob, updateJob, pollMiniMaxJob };
