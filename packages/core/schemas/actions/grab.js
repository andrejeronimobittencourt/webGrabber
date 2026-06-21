import { z } from 'zod'

export const runGrab = z.object({
	grab: z.string().min(1, 'runGrab requires a grab name'),
	params: z.record(z.any()).optional(),
})
