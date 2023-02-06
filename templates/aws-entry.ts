import { ext_r_mime } from '@ctx-core/http'
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { type Stats } from 'fs'
import { readFile, stat } from 'fs/promises'
import { dirname, extname, join, resolve } from 'path'
import { type FetchEvent } from 'solid-start'
import { splitCookiesString } from 'solid-start/node/fetch.js'
import 'solid-start/node/globals.js'
// @ts-ignore
import { default as manifest } from '../../dist/client/route-manifest.json'
// @ts-ignore
import { default as _server } from './entry-server.js'
const server = _server as (event:FetchEvent)=>Promise<Response>
const isBase64Encoded__regex =
	/^(image\/[^(svg)]|audio\/|video\/|application\/(pdf|zip|vnd.|msword|x-shockwave-flash|java-archive))/
export async function handler(
	event:APIGatewayProxyEvent|APIGatewayProxyEventV2
):Promise<APIGatewayProxyResult> {
	const url = new URL(
		(event as APIGatewayProxyEvent).path
		|| (event as APIGatewayProxyEventV2).rawPath,
		`https://${event.requestContext.domainName}`)
	const client_path = resolve(join(dirname(new URL(import.meta.url).pathname), '..', 'client'))
	const pathname = url.pathname
	const fs_path = join(client_path, pathname)
	let stats:Stats
	try {
		stats = await stat(fs_path)
	} catch (err) {
		if (err.code !== 'ENOENT') {
			console.trace(err)
			throw err
		}
	}
	if (stats && stats.isFile()) {
		const ContentType = ext_r_mime[extname(pathname)]
		const isBase64Encoded = isBase64Encoded_(event, ContentType)
		const body = await readFile(fs_path)
			.then($=>$.toString(isBase64Encoded ? 'base64' : undefined))
			.catch($=>{
				console.trace($)
				throw $
			})
		return {
			statusCode: 200,
			headers: { 'content-type': ContentType },
			body,
			isBase64Encoded,
		}
	}
	const clientAddress =
		(event as APIGatewayProxyEvent).requestContext.identity
		? (event as APIGatewayProxyEvent).requestContext.identity.sourceIp
		: (event as APIGatewayProxyEventV2).requestContext.http.sourceIp
	const response = await server({
		request: createRequest(event),
		clientAddress,
		locals: {},
		env: { manifest },
	}).catch($=>{
		console.trace($)
		throw $
	})
	const headers = {}
	for (const [name, value] of response.headers) {
		headers[name] = value
	}
	if (response.headers.has('set-cookie')) {
		const header = /** @type {string} */ (response.headers.get('set-cookie'))
		headers['set-cookie'] = splitCookiesString(header)
	}
	const isBase64Encoded = isBase64Encoded_(event, response.headers.get('Content-Type'))
	const _body = await response.text()
	const body = isBase64Encoded ? Buffer.from(_body).toString('base64') : _body
	return {
		statusCode: response.status,
		headers: headers,
		body,
		isBase64Encoded: isBase64Encoded_(event, response.headers.get('Content-Type')),
	}
	function createRequest(event:APIGatewayProxyEvent|APIGatewayProxyEventV2) {
		const headers = new Headers()
		for (const [key, _value] of Object.entries(event.headers)) {
			const value = _value as string
			headers.append(key, value)
		}
		const method =
			(event as APIGatewayProxyEvent).httpMethod
			|| (event as APIGatewayProxyEventV2).requestContext.http.method
		const init:RequestInit = {
			method,
			headers,
		}
		if (method !== 'GET' && method !== 'HEAD' && event.body) {
			init.body =
				event.isBase64Encoded
				? Buffer.from(event.body, 'base64').toString()
				: event.body
		}
		return new Request(url.href, init)
	}
}
function isBase64Encoded_(event:APIGatewayProxyEvent|APIGatewayProxyEventV2, ContentType:string) {
	return !!(event.isBase64Encoded || ContentType.match(isBase64Encoded__regex))
}
