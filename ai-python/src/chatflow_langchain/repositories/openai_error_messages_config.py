# openai_messages_config.py

OPENAI_MESSAGES_CONFIG = {
    "rate_limit_exceeded": {
        "content": (
            "## Oops! It looks like the OpenAI rate limit has been exceeded.\n\n"
            "Please try again later. For more details on rate limits, visit the [OpenAI API documentation](https://platform.openai.com/docs/guides/rate-limits)."
        ),
        "error_code": "rate_limit_exceeded"
    },
    "billing_error": {
        "content": (
            "## Oops! It looks like there's a problem with the billing information for your OpenAI workspace.\n\n"
            "Your billing details might be missing or you may have hit your usage limit. Please contact your workspace admin and ask them to:\n\n"
            "1. Review your workspace usage and limits [here](https://platform.openai.com/account/billing/limits).\n"
            "2. Update the billing information [here](https://platform.openai.com/account/billing/overview).\n\n"
            "For more details on OpenAI billing and its importance, check out this [guide](https://platform.openai.com/account/billing/overview)."
        ),
        "error_code": "billing_error"
    },
    "content_policy_violation": {
        "content": (
            "It appears that your request has violated OpenAI's content policy. This could be due to the nature of the content or the request itself. Please review the [OpenAI Content Policy](https://platform.openai.com/overview/content-policy) for more details on acceptable content and practices.\n\n"
            "To resolve this issue, consider adjusting your request to align with the content policy guidelines. If you believe this is an error, please contact OpenAI support for further assistance."
        ),
        "error_code": "content_policy_violation"
    },
    "image_generation_error": {
        "content": (
            "It appears that your billing hard limit has been reached. Please check your account and ensure sufficient balance to continue using the service.\n\n"
            "For more details, visit [Billing Information](https://platform.openai.com/account/billing)."
        ),
        "error_code": "image_generation_error"
    },
    "request_time_out": {
        "content": (
            "The request to the OpenAI API has timed out. This may be due to network issues or the API taking too long to respond.\n\n"
            "Please try your request again later. If the issue persists, you might want to check your network connection or contact OpenAI support for further assistance."
        ),
        "error_code": "request_time_out"
    },
    "connection_error": {
        "content": (
            "There was an error connecting to the OpenAI API. This could be due to network issues or the API server being temporarily unavailable.\n\n"
            "Please check your network connection and try again later. If the problem continues, please reach out to OpenAI support for help."
        ),
        "error_code": "connection_error"
    },
    "content_filter_issue": {
        "content": (
            "The request was blocked by OpenAI's content filter. This could be due to the nature of the request or the content. Please review the [OpenAI Content Policy](https://platform.openai.com/overview/content-policy) to ensure your request complies with their guidelines.\n\n"
            "If you believe this is an error, please contact OpenAI support for further assistance."
        ),
        "error_code": "content_filter_issue"
    },
    "insufficient_quota": {
        "content": (
            "It appears that your OpenAI account has insufficient quota to fulfill this request.\n\n"
            "Please refer to the following links for more information:\n\n"
            "- **[OpenAI Account Dashboard](https://platform.openai.com/account/usage)**: View your current quota and usage limits.\n"
            "- **[Account Limits and Tiers](https://platform.openai.com/settings/organization/limits)**: Review your account specific limits and tier.\n"
            "- **[Usage Tiers](https://platform.openai.com/docs/guides/rate-limits/usage-tiers)**: Understand the different usage tiers and their limitations."
        ),
        "error_code": "insufficient_quota"
    },
    "insufficient_quota_mail": {
        "content": (
            "It appears that your OpenAI account has insufficient quota to fulfill this request.<br><br>"
            "Please refer to the following links for more information:<br><br>"
            "- <a href='https://platform.openai.com/account/usage' style='color: #6637EC;'>OpenAI Account Dashboard</a>:View your current quota and usage limits.<br>"
            "- <a href='https://platform.openai.com/settings/organization/limits' style='color: #6637EC;'>Account Limits and Tiers</a>: Review your account specific limits and tier.<br>"
        "- <a href='https://platform.openai.com/docs/guides/rate-limits/usage-tiers' style='color: #6637EC;'>Usage Tiers</a>: Understand the different usage tiers and their limitations."
        ),
        "error_code": "insufficient_quota"
    },
    "model_not_found": {
        "content": (
            "Model Not Found\n\n"
            "It appears that the specified model is not available. Please check the model name and ensure it is correctly spelled. If you need assistance, refer to the [OpenAI Model Documentation](https://platform.openai.com/docs/models/overview) for the list of available models."
        ),
        "error_code": "model_not_found"
    },
    "context_length_exceeded": {
        "content": (
            "Context Length Exceeded\n\n"
            "The total message length exceeds the model's maximum context length. Please reduce the length of your messages to proceed."
        ),
        "error_code": "context_length_exceeded"
    },
    "common_response": {
        "content": (
            "We encountered an issue and were unable to receive a response. This could be due to a variety of reasons including network issues, server problems, or unexpected errors.\n\n"
            "Please try your request again later. If the problem persists, check your network connection."
        ),
        "error_code": "common_response"
    }
}

DEV_MESSAGES_CONFIG = {
    "dev_message": "Your request is in progress. Please wait or contact support for more details.",
    "unknown_message": "We're working on your request. Please try again shortly or reach out to support if needed.",
    "insufficient_quota_message": "It appears that your OpenAI account has insufficient quota to fulfill this request.",
    "url_forbidden_message": "We are unable to scrape the provided URL because access to the site is restricted.",
    "hugging_face_message":"Hugging Face endpoint is unable to process the task as required.",
    "genai_message":"Generative AI is adjusting for optimal performance—please try again shortly."
}



HF_ERROR_MESSAGES_CONFIG = {
    "value_error": {
        "content": (
            "## Value Error Occurred\n\n"
            "It seems there was an issue with the value provided in the request. Please check your input and try again.\n\n"
            "If the problem persists, consider reviewing the documentation for the correct input formats or types."
        ),
        "error_code": "value_error"
    },
    "runtime_error": {
        "content": (
            "## Runtime Error Occurred\n\n"
            "A runtime error has occurred while processing your request. This may be due to an unexpected condition or a bug.\n\n"
            "Please try your request again later. If the issue persists, consider reporting it to the support team with the details."
        ),
        "error_code": "runtime_error"
    },
    "http_error": {
        "content": (
            "## HTTP Error Occurred\n\n"
            "There was an HTTP error while trying to connect to the Hugging Face API. This may be due to server issues or incorrect request parameters.\n\n"
            "Please check the request and try again. If the problem continues, please refer to the [Hugging Face documentation](https://huggingface.co/docs) for assistance."
        ),
        "error_code": "http_error"
    },
    "hf_hub_http_error": {
        "content": (
            "## Hugging Face Hub HTTP Error\n\n"
            "A specific error occurred while accessing the Hugging Face Hub. This could be due to authentication issues, permission errors,Endpoint is either scaled to zero or still intializing, resource unavailability or the model hosted on your Hugging Face endpoint is having trouble processing the task as per your requirements.\n\n"
            "Please verify your access rights and try again. For further assistance, check the [Hugging Face Hub documentation](https://huggingface.co/docs/huggingface_hub)."
        ),
        "error_code": "hf_hub_http_error"
    },
    "entry_not_found": {
        "content": (
            "## Entry Not Found\n\n"
            "The specified entry could not be found. This may be due to a typo in the entry name or the entry being deleted.\n\n"
            "Please double-check the entry name and try again. If you need further assistance, consider reaching out to support."
        ),
        "error_code": "entry_not_found"
    },
    "bad_request_error": {
        "content": (
            "## Bad Request Error\n\n"
            "Your request was invalid or improperly formatted. Please verify that the endpoint is running and ensure all required parameters are included and correctly structured.\n\n"
            "For guidance on the correct request structure, please refer to the [Hugging Face API documentation](https://huggingface.co/docs)."
        ),
        "error_code": "bad_request_error"
    },
    "common_response": {
        "content": (
            "We encountered an issue and were unable to receive a response from the Hugging Face API. This could be due to various reasons, including network issues, server problems, or unexpected errors.\n\n"
            "Please try your request again later. If the problem persists, check your network connection or [contact support](https://huggingface.co/contact) for further assistance."
        ),
        "error_code": "common_response"
    },
    "context_length_insufficient":{
        "content":( 
            """The minimum required context length is **8096** tokens for this platform.\n\nThe input context length is insufficient.\n\nIf you are using a Hugging Face hosted model, make sure to adjust the context length (8096) or the maximum input length as necessary (8096). \n\nFor further adjustments, visit your Hugging Face inference endpoint configurations to review and modify the settings: [Hugging Face Inference Endpoint](https://ui.endpoints.huggingface.co/).\n\nFeel free to adjust your input and try again.\n\nWe're here to help ensure your experience is seamless and efficient!"""),
        "error_code": "context_length_insufficient"
    },
    "max_total_token_insufficient":{
        "content":("""**Error:** Insufficient Max Total Tokens
        A minimum difference of 4096 tokens is required between `Max Number of tokens` and `Max Input Length`.
        Please visit the [model endpoint settings page](https://ui.endpoints.huggingface.co/) to adjust your configuration.""")
    },
    "embedding_model_required": {
        "content": (
            "An OpenAI API key is required to enable functionality with the embedding model\n\n"
            "Please ensure that a valid OpenAI API key is provided when using the embedding model. If the issue persists, contact [OpenAI Support](https://help.openai.com) for further assistance if you are experiencing related issues."
        ),
        "error_code": "embedding_model_required"
    },
}


ANTHROPIC_ERROR_MESSAGES_CONFIG = {
    "anthropic_error": {
        "content": (
            "Oops! It seems like an unknown error occurred with the Anthropic API.\n\n"
            "Please try again later. If the issue persists, please reach out to Anthropic support for more assistance."
        ),
        "error_code": "anthropic_error"
    },
    "api_error": {
        "content": (
            "An error occurred while communicating with the Anthropic API.\n\n"
            "Please check your request or try again later. If the issue persists, contact Anthropic support for more details."
        ),
        "error_code": "api_error"
    },
    "api_timeout_error": {
        "content": (
            "The request to the Anthropic API timed out.\n\n"
            "This could be due to network issues or the request taking too long to process. Please try again later."
        ),
        "error_code": "api_timeout_error"
    },
    "api_connection_error": {
        "content": (
            "There was an error connecting to the Anthropic API.\n\n"
            "This could be due to network issues or the API server being temporarily unavailable. Please check your connection and try again."
        ),
        "error_code": "api_connection_error"
    },
    "permission_error": {
        "content": (
            "You do not have permission to access this resource.\n\n"
            "Please ensure you have the appropriate permissions to perform this action and try again."
        ),
        "error_code": "permission_error"
    },
    "authentication_error": {
        "content": (
            "Authentication failed.\n\n"
            "Please check your API keys or authentication credentials and try again. If the problem persists, contact Anthropic support."
        ),
        "error_code": "authentication_error"
    },
    "api_status_error": {
        "content": (
            "There was an issue with the status of the Anthropic API.\n\n"
            "Please check the API status page for updates or try again later."
        ),
        "error_code": "api_status_error"
    },
    "rate_limit_error": {
        "content": (
            "Oops! It looks like you've hit the rate limit for the Anthropic API.\n\n"
            "Please try again later. For more details on rate limits, refer to the [Anthropic API documentation](https://www.anthropic.com/docs)."
        ),
        "error_code": "rate_limit_error"
    },
    "not_found_error": {
        "content": (
            "The requested resource could not be found.\n\n"
            "Please ensure the resource exists and the request is properly formatted."
        ),
        "error_code": "not_found_error"
    },
    "invalid_api_key": {
        "content": (
            "The provided API key is invalid.\n\n"
            "Please verify your API key and try again. If you continue to experience issues, contact [Anthropic Support](https://support.anthropic.com).\n\n"
            "For further assistance, refer to the [API Key Best Practices](https://support.anthropic.com/en/articles/8384961-what-should-i-do-if-i-suspect-my-api-key-has-been-compromised)."
        ),
        "error_code": "invalid_api_key"
    },
    "invalid_request_error": {
        "content": (
            "The request made to the Anthropic API is invalid.\n\n"
            "Please review the syntax or parameters and try again. If you are unsure, check the [API Documentation](https://support.anthropic.com/en/collections/9811458-api-usage-and-best-practices) for guidance on correct usage.\n\n"
            "If the problem persists, feel free to reach out to [Anthropic Support](https://support.anthropic.com)."
        ),
        "error_code": "invalid_request_error"
    },
    "embedding_model_required": {
        "content": (
            "An OpenAI API key is required to enable functionality with the embedding model\n\n"
            "Please ensure that a valid OpenAI API key is provided when using the embedding model. If the issue persists, contact [OpenAI Support](https://help.openai.com) for further assistance if you are experiencing related issues."
        ),
        "error_code": "embedding_model_required"
    },
    "common_response": {
        "content": (
            "We encountered an issue and could not complete your request. This may be due to network issues, server problems, or unexpected errors.\n\n"
            "Please try again later. If the issue persists, contact Anthropic support for further assistance."
        ),
        "error_code": "common_response"
    }
}

GENAI_ERROR_MESSAGES_CONFIG = {
    "resource_exhausted_error": {
        "content": (
            "## Oops! It looks like you've exhausted your resources for the Google GenAI API.\n\n"
            "Please check your usage and available resources in the [Google Cloud Billing](https://console.cloud.google.com/billing/linkedaccount?project=gen-lang-client-0162554379) section.\n"
            "For more information, visit the [Google AI Studio](https://aistudio.google.com/) and review your usage limits."
        ),
        "error_code": "resource_exhausted_error"
    },
    "google_api_call_error": {
        "content": (
            "## There was an error making a call to the Google GenAI API.\n\n"
            "This could be due to issues with the API endpoint or network. Please check your API configuration, and ensure you have proper connectivity.\n"
            "For more details, check the [Google Cloud Dashboard](https://aistudio.google.com/)."
        ),
        "error_code": "google_api_call_error"
    },
    "google_api_error": {
        "content": (
            "## An error occurred with the Google GenAI API.\n\n"
            "This could be due to an API issue or misconfiguration. Please review your API usage and configurations.\n"
            "For assistance, you can check the [Google Generative AI Documentation](https://ai.google.dev/) or the [Google Cloud Billing](https://console.cloud.google.com/billing/linkedaccount?project=gen-lang-client-0162554379)."
        ),
        "error_code": "google_api_error"
    },
    "google_genai_error": {
        "content": (
            "## Something went wrong with Google GenAI.\n\n"
            "There was an issue related to the Google GenAI API. Please review the [Google Cloud Dashboard](https://aistudio.google.com/) to monitor your usage and status.\n"
            "For more details, refer to the [Google Generative AI Main Page](https://ai.google.dev/)."
        ),
        "error_code": "google_genai_error"
    },
    "embedding_model_required": {
        "content": (
            "An OpenAI API key is required to enable functionality with the embedding model\n\n"
            "Please ensure that a valid OpenAI API key is provided when using the embedding model. If the issue persists, contact [OpenAI Support](https://help.openai.com) for further assistance if you are experiencing related issues."
        ),
        "error_code": "embedding_model_required"
    },
    "common_response": {
        "content": (
            "We encountered an issue and were unable to receive a response from Google GenAI.\n\n"
            "This could be due to a variety of reasons, including API issues, network problems, or other unexpected errors.\n\n"
            "Please try again later, check your network, or visit [Google AI Studio](https://aistudio.google.com/) for more information."
        ),
        "error_code": "common_response"
    },
    "agent_error": {
        "content": (
            "Something went wrong while processing your request. This might be a temporary issue.\n\n"
            "Please try again in a few moments.\n\n"
            "Please check your request and try again. If the problem persists, consider reaching out to support for further assistance."
        ),
        "error_code": "agent_error"
    },
    "audio_length_exceeded": {
        "content": (
            "The audio input exceeds the maximum allowed duration of 1 hour and 30 minutes. Please reduce the audio length and try again."
        ),
        "error_code": "audio_length_exceeded"
    },
}

WEAM_ROUTER_MESSAGES_CONFIG = {
    "rate_limit_exceeded": {
        "content": (
            "## Oops! You've hit the OpenRouter API rate limit.\n\n"
            "Please wait before making more requests."
        ),
        "error_code": "rate_limit_exceeded"
    },
    "billing_error": {
        "content": (
            "## Billing Issue Detected\n\n"
            "It looks like there's a problem with your OpenRouter billing details. You might have reached your usage limit or have missing billing information.\n\n"
        ),
        "error_code": "billing_error"
    },
    "context_length_exceeded": {
        "content": (
            "## Context Limit Reached\n\n"
            "The input exceeds the model's maximum context length. Try shortening your input and resubmitting."
        ),
        "error_code": "context_length_exceeded"
    },
    "invalid_request_error": {
        "content": (
            "## Invalid Request\n\n"
            "The request was not properly formatted or contained invalid parameters.\n\n"
        ),
        "error_code": "invalid_request_error"
    },
    "model_not_found": {
        "content": (
            "## Model Not Found\n\n"
            "The specified model is not available. Please check the model name and ensure it is correctly spelled.\n\n"
        ),
        "error_code": "model_not_found"
    },
    "connection_error": {
        "content": (
            "## Connection Issue\n\n"
            "There was a problem connecting to OpenRouter. It could be due to network issues or temporary API downtime.\n\n"
        ),
        "error_code": "connection_error"
    },
    "timeout_error": {
        "content": (
            "## Request Timed Out\n\n"
            "The request to OpenRouter took too long and was canceled. This could be due to network latency or high server load.\n\n"
        ),
        "error_code": "timeout_error"
    },
    "quota_exceeded": {
        "content": (
            "## Insufficient Quota\n\n"
            "Your OpenRouter account has exceeded its quota for API usage.\n\n"
        ),
        "error_code": "quota_exceeded"
    },
    "content_policy_violation": {
        "content": (
            "## Content Policy Violation\n\n"
            "Your request was blocked due to a policy violation."
        ),
        "error_code": "content_policy_violation"
    },
    "content_filter_issue": {
        "content": (
            "The request was blocked by OpenAI's content filter. This could be due to the nature of the request or the content. Please review the [OpenAI Content Policy](https://platform.openai.com/overview/content-policy) to ensure your request complies with their guidelines.\n\n"
            "If you believe this is an error, please contact OpenAI support for further assistance."
        ),
        "error_code": "content_filter_issue"
    },
    "common_response": {
        "content": (
            "We encountered an issue and were unable to receive a response. This could be due to a variety of reasons including network issues, server problems, or unexpected errors.\n\n"
            "Please try your request again later."
        ),
        "error_code": "common_response"
    }
}