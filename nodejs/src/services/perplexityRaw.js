const { llmStreamingEvents } = require('../config/constants/llm');
const { SOCKET_EVENTS } = require('../config/constants/socket');
const { createLLMConversation, updateTokenFields } = require('./thread');
const { calculateCost } = require('./callbacks/costConfig');
const logger = require('../utils/logger');
const { LINK } = require('../config/config');

function normalizeMessages(messages) {
	// Accept LangGraph-like [['user', '...']] or LangChain message objects
	if (!Array.isArray(messages)) return [];
	return messages.map((m) => {
		if (Array.isArray(m)) {
			const role = m[0] === 'system' ? 'system' : m[0] === 'user' ? 'user' : m[0] === 'assistant' ? 'assistant' : 'user';
			return { role, content: m[1] || '' };
		}
		const name = m?.constructor?.name;
		if (name === 'SystemMessage') return { role: 'system', content: m.content || '' };
		if (name === 'HumanMessage') return { role: 'user', content: m.content || '' };
		if (name === 'AIMessage') return { role: 'assistant', content: m.content || '' };
		return { role: 'user', content: String(m?.content || '') };
	});
}

async function perplexityRawStream({
	apiKey,
	model,
	messages,
	data,
	socket,
	threadId,
	options = {},
}) {
	let tokenData = {
		prompt_tokens: 0,
		completion_tokens: 0,
		total_tokens: 0,
		totalCost: 0,
	};
	try {
		const url = LINK.PERPLEXITY_API_URL + '/chat/completions';
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		};

		const body = {
			model: data.model,
			messages: normalizeMessages(messages),
			temperature: options.temperature ?? 1,
			stream: true,
		};
		if (options.maxTokens) body.max_tokens = options.maxTokens;
		if (options.search_recency_filter) body.search_recency_filter = options.search_recency_filter;
		if (Array.isArray(options.search_domain_filter) && options.search_domain_filter.length) {
			body.search_domain_filter = options.search_domain_filter;
		}
		if (options.web_search_options) body.web_search_options = options.web_search_options;
		if (options.extra_body && typeof options.extra_body === 'object') Object.assign(body, options.extra_body);

		let proccedMsg = '';
		let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

		// Manual token calculation will be done after streaming completes
		const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
		if (!res.ok || !res.body) {
			const text = await res.text().catch(() => '');
			throw new Error(`Perplexity API error ${res.status} ${res.statusText}: ${text}`);
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop();
			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const payload = line.slice(6).trim();
				if (!payload || payload === llmStreamingEvents.RESPONSE_DONE) continue;
				let json;
				try {
					json = JSON.parse(payload);
				} catch {
					continue;
				}

				const choice = json?.choices?.[0];
				const deltaText = choice?.delta?.content || '';

				const search_results = json?.search_results || [];
				const citations = json?.citations || [];
				const u = json?.usage || {};

				if (deltaText) {
					proccedMsg += deltaText;
					socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, { chunk: deltaText, search_results, citations });
					data.search_results = search_results;
					data.search_citations = citations;
				}

				if (u && (u.prompt_tokens || u.completion_tokens || u.total_tokens)) {
					usage = {
						prompt_tokens: u.prompt_tokens ?? usage.prompt_tokens,
						completion_tokens: u.completion_tokens ?? usage.completion_tokens,
						total_tokens: u.total_tokens ?? ((u.prompt_tokens || 0) + (u.completion_tokens || 0)),
					};
				}
			}
		}

		socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
			chunk: llmStreamingEvents.RESPONSE_DONE,
			proccedMsg,
		});

		// Manual token calculation and database update
		if (data.threadId && usage.prompt_tokens > 0) {
			try {
				// Calculate cost using the cost calculation function
				const totalCost = calculateCost(usage.prompt_tokens, usage.completion_tokens, data.model);

				// Prepare token data for database update
				tokenData = {
					totalUsed: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
					promptT: usage.prompt_tokens,
					completion: usage.completion_tokens,
					totalCost: totalCost,
					imageT: 0
				};
			} catch (error) {
				logger.error('❌ [PERPLEXITY_RAW] Error updating token usage:', error);
			}
		}

		if (proccedMsg) {
			try {
				await createLLMConversation({
					...data,
					answer: proccedMsg,
					usedCredit: data.usedCredit || 1,
				});
				await updateTokenFields(data.threadId, tokenData);
			} catch (saveErr) {
				logger.error('Error saving Perplexity conversation:', saveErr);
			}
		}
	} catch (error) {
		logger.error('Perplexity RAW error:', error);
		socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
			event: llmStreamingEvents.CONVERSATION_ERROR,
			chunk: llmStreamingEvents.RESPONSE_ERROR_MESSAGE,
		});
	}
}

module.exports = { perplexityRawStream, normalizeMessages };