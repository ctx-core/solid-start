import type { Ctx } from '@ctx-core/object'
import type { APIEvent, FetchEvent, PageEvent, ServerFunctionEvent } from 'solid-start'
export type FetchEvent_w_ctx_T = (FetchEvent|ServerFunctionEvent|APIEvent|PageEvent)&{
	locals:FetchEvent__locals_T
}
export type PageEvent_w_ctx_T = PageEvent&({
	locals:FetchEvent__locals_T
})
export type APIEvent_w_ctx_T = FetchEvent&APIEvent&({
	locals:FetchEvent__locals_T
})
type FetchEvent__locals_T = Record<string, unknown>&{
	ctx:Ctx
}
