/**
 * Stripe MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const STRIPE_API_BASE = process.env.STRIPE_API_BASE || 'https://api.stripe.com/v1';

/**
 * Make a request to the Stripe API
 * @param {string} endpoint - The API endpoint
 * @param {string} stripeSecretKey - Stripe secret key
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST requests
 * @param {string} method - HTTP method (GET, POST)
 * @returns {Object|null} API response data
 */
async function makeStripeRequest(endpoint, stripeSecretKey, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
        let response;
        const url = `${STRIPE_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params, timeout: 30000 });
        } else {
            // Convert JSON data to form-encoded for Stripe API
            const formData = new URLSearchParams();
            if (jsonData) {
                Object.keys(jsonData).forEach(key => {
                    if (jsonData[key] !== null && jsonData[key] !== undefined) {
                        if (typeof jsonData[key] === 'object' && !Array.isArray(jsonData[key])) {
                            // Handle nested objects
                            Object.keys(jsonData[key]).forEach(nestedKey => {
                                formData.append(`${key}[${nestedKey}]`, jsonData[key][nestedKey]);
                            });
                        } else if (Array.isArray(jsonData[key])) {
                            // Handle arrays
                            jsonData[key].forEach((item, index) => {
                                if (typeof item === 'object') {
                                    Object.keys(item).forEach(itemKey => {
                                        formData.append(`${key}[${index}][${itemKey}]`, item[itemKey]);
                                    });
                                } else {
                                    formData.append(`${key}[${index}]`, item);
                                }
                            });
                        } else {
                            formData.append(key, jsonData[key]);
                        }
                    }
                });
            }
            response = await axios.post(url, formData, { headers, params, timeout: 30000 });
        }

        return response.data;
    } catch (error) {
        console.error('Stripe API Error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Format Stripe API response for MCP
 * @param {any} data - Response data
 * @returns {string} Formatted response
 */
function formatStripeResponse(data) {
    if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
    }
    return String(data);
}

/**
 * Get Stripe secret key from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} Stripe secret key or null if not found
 */
async function getStripeSecretKey(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.STRIPE || !user.mcpdata.STRIPE.secret_key) {
            return null;
        }
        // Decrypt the secret key before returning
        const decryptedKey = decryptedData(user.mcpdata.STRIPE.secret_key);

        return decryptedKey;
    } catch (error) {
        console.error('Error fetching Stripe secret key:', error.message);
        return null;
    }
}

// =============================================================================
// ACCOUNT TOOLS
// =============================================================================

/**
 * Get Stripe account information
 * @param {string} userId - User ID to get secret key from
 * @returns {string} Formatted account information
 */
async function getStripeAccountInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe account information');
    
    const data = await makeStripeRequest('account', stripeSecretKey);
    if (!data) {
        return 'Failed to fetch Stripe account information';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// BALANCE TOOLS
// =============================================================================

/**
 * Retrieve Stripe account balance
 * @param {string} userId - User ID to get secret key from
 * @returns {string} Formatted balance information
 */
async function retrieveBalance(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe account balance');
    
    const data = await makeStripeRequest('balance', stripeSecretKey);
    if (!data) {
        return 'Failed to fetch Stripe account balance';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// COUPON TOOLS
// =============================================================================

/**
 * Create a new coupon in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} percentOff - Percent off the price (mutually exclusive with amountOff)
 * @param {number} amountOff - Amount off in cents (mutually exclusive with percentOff)
 * @param {string} currency - Currency for amountOff (default: usd)
 * @param {string} duration - Duration type (once, repeating, forever)
 * @param {number} durationInMonths - Duration in months for repeating coupons
 * @param {number} maxRedemptions - Maximum number of times this coupon can be redeemed
 * @param {number} redeemBy - Timestamp after which the coupon can no longer be redeemed
 * @param {Object} additionalParams - Additional coupon parameters
 * @returns {string} Formatted coupon information
 */
async function createCoupon(
    userId = null,
    percentOff = null,
    amountOff = null,
    currency = 'usd',
    duration = 'once',
    durationInMonths = null,
    maxRedemptions = null,
    redeemBy = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe coupon');
    
    // Validate that either percentOff or amountOff is provided
    if (percentOff === null && amountOff === null) {
        return 'Error: Either percentOff or amountOff must be provided';
    }
    
    const couponData = {
        currency: currency,
        duration: duration,
        ...additionalParams
    };
    
    if (percentOff !== null) {
        couponData.percent_off = percentOff;
    }
    if (amountOff !== null) {
        couponData.amount_off = amountOff;
    }
    if (durationInMonths !== null) {
        couponData.duration_in_months = durationInMonths;
    }
    if (maxRedemptions !== null) {
        couponData.max_redemptions = maxRedemptions;
    }
    if (redeemBy !== null) {
        couponData.redeem_by = redeemBy;
    }
    
    const data = await makeStripeRequest('coupons', stripeSecretKey, null, couponData, 'POST');
    if (!data) {
        return 'Failed to create Stripe coupon';
    }
    
    return formatStripeResponse(data);
}

/**
 * List all coupons in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of coupons to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @returns {string} Formatted coupons list
 */
async function listCoupons(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe coupons');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    
    const data = await makeStripeRequest('coupons', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe coupons';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// CUSTOMER TOOLS
// =============================================================================

/**
 * Create a new customer in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} email - Customer's email address
 * @param {string} name - Customer's full name
 * @param {string} phone - Customer's phone number
 * @param {string} description - Description of the customer
 * @param {Object} metadata - Additional metadata for the customer
 * @param {Object} additionalParams - Additional customer parameters
 * @returns {string} Formatted customer information
 */
async function createCustomer(
    userId = null,
    email = null,
    name = null,
    phone = null,
    description = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe customer');
    
    const customerData = { ...additionalParams };
    if (email) {
        customerData.email = email;
    }
    if (name) {
        customerData.name = name;
    }
    if (phone) {
        customerData.phone = phone;
    }
    if (description) {
        customerData.description = description;
    }
    if (metadata) {
        customerData.metadata = metadata;
    }
    
    const data = await makeStripeRequest('customers', stripeSecretKey, null, customerData, 'POST');
    if (!data) {
        return 'Failed to create Stripe customer';
    }
    
    return formatStripeResponse(data);
}

/**
 * List all customers in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of customers to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} email - Filter by email address
 * @returns {string} Formatted customers list
 */
async function listCustomers(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    email = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe customers');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (email) {
        params.email = email;
    }
    
    const data = await makeStripeRequest('customers', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe customers';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// DISPUTE TOOLS
// =============================================================================

/**
 * List all disputes in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of disputes to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @returns {string} Formatted disputes list
 */
async function listDisputes(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe disputes');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    
    const data = await makeStripeRequest('disputes', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe disputes';
    }
    
    return formatStripeResponse(data);
}

/**
 * Update a dispute in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} disputeId - ID of the dispute to update
 * @param {Object} evidence - Evidence to submit for the dispute
 * @param {Object} metadata - Additional metadata for the dispute
 * @param {Object} additionalParams - Additional dispute parameters
 * @returns {string} Formatted updated dispute information
 */
async function updateDispute(
    userId = null,
    disputeId,
    evidence = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Updating Stripe dispute: ${disputeId}`);
    
    const disputeData = { ...additionalParams };
    if (evidence) {
        disputeData.evidence = evidence;
    }
    if (metadata) {
        disputeData.metadata = metadata;
    }
    
    const data = await makeStripeRequest(`disputes/${disputeId}`, stripeSecretKey, null, disputeData, 'POST');
    if (!data) {
        return `Failed to update Stripe dispute: ${disputeId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// INVOICE TOOLS
// =============================================================================

/**
 * Create a new invoice in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} customer - Customer ID
 * @param {string} collectionMethod - Collection method (charge_automatically or send_invoice)
 * @param {boolean} autoAdvance - Whether to automatically advance the invoice
 * @param {Object} additionalParams - Additional invoice parameters
 * @returns {string} Formatted invoice information
 */
async function createInvoice(
    userId = null,
    customer,
    collectionMethod = 'charge_automatically',
    autoAdvance = true,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe invoice');
    
    const invoiceData = {
        customer: customer,
        collection_method: collectionMethod,
        auto_advance: autoAdvance,
        ...additionalParams
    };
    
    const data = await makeStripeRequest('invoices', stripeSecretKey, null, invoiceData, 'POST');
    if (!data) {
        return 'Failed to create Stripe invoice';
    }
    
    return formatStripeResponse(data);
}

/**
 * Create a new invoice item in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} customer - Customer ID
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code (default: usd)
 * @param {string} description - Description of the invoice item
 * @param {string} invoice - Invoice ID to add the item to
 * @param {Object} additionalParams - Additional invoice item parameters
 * @returns {string} Formatted invoice item information
 */
async function createInvoiceItem(
    userId = null,
    customer,
    amount,
    currency = 'usd',
    description = null,
    invoice = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe invoice item');
    
    const itemData = {
        customer: customer,
        amount: amount,
        currency: currency,
        ...additionalParams
    };
    if (description) {
        itemData.description = description;
    }
    if (invoice) {
        itemData.invoice = invoice;
    }
    
    const data = await makeStripeRequest('invoiceitems', stripeSecretKey, null, itemData, 'POST');
    if (!data) {
        return 'Failed to create Stripe invoice item';
    }
    
    return formatStripeResponse(data);
}

/**
 * Finalize an invoice in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} invoiceId - ID of the invoice to finalize
 * @param {boolean} autoAdvance - Whether to automatically advance the invoice
 * @returns {string} Formatted finalized invoice information
 */
async function finalizeInvoice(
    userId = null,
    invoiceId,
    autoAdvance = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Finalizing Stripe invoice: ${invoiceId}`);
    
    const invoiceData = {};
    if (autoAdvance !== null) {
        invoiceData.auto_advance = autoAdvance;
    }
    
    const data = await makeStripeRequest(`invoices/${invoiceId}/finalize`, stripeSecretKey, null, invoiceData, 'POST');
    if (!data) {
        return `Failed to finalize Stripe invoice: ${invoiceId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * List all invoices in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of invoices to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} customer - Filter by customer ID
 * @param {string} status - Filter by invoice status
 * @returns {string} Formatted invoices list
 */
async function listInvoices(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    customer = null,
    status = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe invoices');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (customer) {
        params.customer = customer;
    }
    if (status) {
        params.status = status;
    }
    
    const data = await makeStripeRequest('invoices', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe invoices';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PAYMENT LINK TOOLS
// =============================================================================

/**
 * Create a new payment link in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {Array} lineItems - List of line items for the payment link
 * @param {Object} afterCompletion - Configuration for after completion behavior
 * @param {boolean} allowPromotionCodes - Whether to allow promotion codes
 * @param {string} billingAddressCollection - Billing address collection mode
 * @param {Object} additionalParams - Additional payment link parameters
 * @returns {string} Formatted payment link information
 */
async function createPaymentLink(
    userId = null,
    lineItems,
    afterCompletion = null,
    allowPromotionCodes = false,
    billingAddressCollection = 'auto',
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe payment link');
    
    const paymentLinkData = {
        line_items: lineItems,
        allow_promotion_codes: allowPromotionCodes,
        billing_address_collection: billingAddressCollection,
        ...additionalParams
    };
    if (afterCompletion) {
        paymentLinkData.after_completion = afterCompletion;
    }
    
    const data = await makeStripeRequest('payment_links', stripeSecretKey, null, paymentLinkData, 'POST');
    if (!data) {
        return 'Failed to create Stripe payment link';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PAYMENT INTENT TOOLS
// =============================================================================

/**
 * List all payment intents in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of payment intents to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} customer - Filter by customer ID
 * @returns {string} Formatted payment intents list
 */
async function listPaymentIntents(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    customer = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe payment intents');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (customer) {
        params.customer = customer;
    }
    
    const data = await makeStripeRequest('payment_intents', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe payment intents';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PRICE TOOLS
// =============================================================================

/**
 * Create a new price in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} unitAmount - Unit amount in cents
 * @param {string} currency - Currency code (default: usd)
 * @param {Object} recurring - Recurring configuration for subscription prices
 * @param {string} product - Product ID (mutually exclusive with productData)
 * @param {Object} productData - Product data to create (mutually exclusive with product)
 * @param {Object} additionalParams - Additional price parameters
 * @returns {string} Formatted price information
 */
async function createPrice(
    userId = null,
    unitAmount,
    currency = 'usd',
    recurring = null,
    product = null,
    productData = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe price');
    
    // Validate that either product or productData is provided
    if (product === null && productData === null) {
        return 'Error: Either product or productData must be provided';
    }
    
    const priceData = {
        unit_amount: unitAmount,
        currency: currency,
        ...additionalParams
    };
    
    if (product) {
        priceData.product = product;
    }
    if (productData) {
        priceData.product_data = productData;
    }
    if (recurring) {
        priceData.recurring = recurring;
    }
    
    const data = await makeStripeRequest('prices', stripeSecretKey, null, priceData, 'POST');
    if (!data) {
        return 'Failed to create Stripe price';
    }
    
    return formatStripeResponse(data);
}

/**
 * List all prices in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of prices to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {boolean} active - Filter by active status
 * @param {string} product - Filter by product ID
 * @returns {string} Formatted prices list
 */
async function listPrices(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    active = null,
    product = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe prices');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (active !== null) {
        params.active = active;
    }
    if (product) {
        params.product = product;
    }
    
    const data = await makeStripeRequest('prices', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe prices';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PRODUCT TOOLS
// =============================================================================

/**
 * Create a new product in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} name - Product name
 * @param {string} description - Product description
 * @param {Array} images - List of image URLs
 * @param {Object} metadata - Additional metadata for the product
 * @param {Object} additionalParams - Additional product parameters
 * @returns {string} Formatted product information
 */
async function createProduct(
    userId = null,
    name,
    description = null,
    images = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe product');
    
    const productData = {
        name: name,
        ...additionalParams
    };
    if (description) {
        productData.description = description;
    }
    if (images) {
        productData.images = images;
    }
    if (metadata) {
        productData.metadata = metadata;
    }
    
    const data = await makeStripeRequest('products', stripeSecretKey, null, productData, 'POST');
    if (!data) {
        return 'Failed to create Stripe product';
    }
    
    return formatStripeResponse(data);
}

/**
 * List all products in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of products to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {boolean} active - Filter by active status
 * @returns {string} Formatted products list
 */
async function listProducts(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    active = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe products');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (active !== null) {
        params.active = active;
    }
    
    const data = await makeStripeRequest('products', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe products';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// REFUND TOOLS
// =============================================================================

/**
 * Create a new refund in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentIntent - Payment intent ID (mutually exclusive with charge)
 * @param {string} charge - Charge ID (mutually exclusive with paymentIntent)
 * @param {number} amount - Refund amount in cents (defaults to full amount)
 * @param {string} reason - Refund reason (duplicate, fraudulent, requested_by_customer)
 * @param {Object} metadata - Additional metadata for the refund
 * @param {Object} additionalParams - Additional refund parameters
 * @returns {string} Formatted refund information
 */
async function createRefund(
    userId = null,
    paymentIntent = null,
    charge = null,
    amount = null,
    reason = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Creating Stripe refund');
    
    // Validate that either paymentIntent or charge is provided
    if (paymentIntent === null && charge === null) {
        return 'Error: Either paymentIntent or charge must be provided';
    }
    
    const refundData = { ...additionalParams };
    if (paymentIntent) {
        refundData.payment_intent = paymentIntent;
    }
    if (charge) {
        refundData.charge = charge;
    }
    if (amount) {
        refundData.amount = amount;
    }
    if (reason) {
        refundData.reason = reason;
    }
    if (metadata) {
        refundData.metadata = metadata;
    }
    
    const data = await makeStripeRequest('refunds', stripeSecretKey, null, refundData, 'POST');
    if (!data) {
        return 'Failed to create Stripe refund';
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// SUBSCRIPTION TOOLS
// =============================================================================

/**
 * Cancel a subscription in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} subscriptionId - ID of the subscription to cancel
 * @param {boolean} prorate - Whether to prorate the cancellation
 * @param {boolean} invoiceNow - Whether to invoice immediately
 * @param {Object} additionalParams - Additional cancellation parameters
 * @returns {string} Formatted cancelled subscription information
 */
async function cancelSubscription(
    userId = null,
    subscriptionId,
    prorate = true,
    invoiceNow = false,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Cancelling Stripe subscription: ${subscriptionId}`);
    
    const cancelData = {
        prorate: prorate,
        invoice_now: invoiceNow,
        ...additionalParams
    };
    
    const data = await makeStripeRequest(`subscriptions/${subscriptionId}/cancel`, stripeSecretKey, null, cancelData, 'POST');
    if (!data) {
        return `Failed to cancel Stripe subscription: ${subscriptionId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * List all subscriptions in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of subscriptions to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} customer - Filter by customer ID
 * @param {string} status - Filter by subscription status
 * @returns {string} Formatted subscriptions list
 */
async function listSubscriptions(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    customer = null,
    status = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe subscriptions');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (customer) {
        params.customer = customer;
    }
    if (status) {
        params.status = status;
    }
    
    const data = await makeStripeRequest('subscriptions', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe subscriptions';
    }
    
    return formatStripeResponse(data);
}

/**
 * Update a subscription in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} subscriptionId - ID of the subscription to update
 * @param {Array} items - List of subscription items
 * @param {Object} metadata - Additional metadata for the subscription
 * @param {Object} additionalParams - Additional subscription parameters
 * @returns {string} Formatted updated subscription information
 */
async function updateSubscription(
    userId = null,
    subscriptionId,
    items = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Updating Stripe subscription: ${subscriptionId}`);
    
    const subscriptionData = { ...additionalParams };
    if (items) {
        subscriptionData.items = items;
    }
    if (metadata) {
        subscriptionData.metadata = metadata;
    }
    
    const data = await makeStripeRequest(`subscriptions/${subscriptionId}`, stripeSecretKey, null, subscriptionData, 'POST');
    if (!data) {
        return `Failed to update Stripe subscription: ${subscriptionId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PAYMENT INTENT TOOLS
// =============================================================================

/**
 * Create a new payment intent in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} amount - Amount in smallest currency unit (e.g., cents)
 * @param {string} currency - Three-letter ISO currency code
 * @param {string} customer - Customer ID (optional)
 * @param {string} description - Description for the payment
 * @param {Object} metadata - Additional metadata
 * @param {Object} additionalParams - Additional payment intent parameters
 * @returns {string} Formatted payment intent information
 */
async function createPaymentIntent(
    userId = null,
    amount,
    currency = 'usd',
    customer = null,
    description = null,
    metadata = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Creating Stripe payment intent for amount: ${amount} ${currency}`);
    
    const paymentIntentData = {
        amount: amount,
        currency: currency,
        ...additionalParams
    };
    
    if (customer) {
        paymentIntentData.customer = customer;
    }
    if (description) {
        paymentIntentData.description = description;
    }
    if (metadata) {
        paymentIntentData.metadata = metadata;
    }
    
    const data = await makeStripeRequest('payment_intents', stripeSecretKey, null, paymentIntentData, 'POST');
    if (!data) {
        return 'Failed to create Stripe payment intent';
    }
    
    return formatStripeResponse(data);
}

/**
 * Retrieve a payment intent from Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentIntentId - ID of the payment intent to retrieve
 * @returns {string} Formatted payment intent information
 */
async function retrievePaymentIntent(userId = null, paymentIntentId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Retrieving Stripe payment intent: ${paymentIntentId}`);
    
    const data = await makeStripeRequest(`payment_intents/${paymentIntentId}`, stripeSecretKey);
    if (!data) {
        return `Failed to retrieve Stripe payment intent: ${paymentIntentId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * Confirm a payment intent in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentIntentId - ID of the payment intent to confirm
 * @param {string} paymentMethod - Payment method ID (optional)
 * @param {Object} additionalParams - Additional confirmation parameters
 * @returns {string} Formatted confirmed payment intent information
 */
async function confirmPaymentIntent(
    userId = null,
    paymentIntentId,
    paymentMethod = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Confirming Stripe payment intent: ${paymentIntentId}`);
    
    const confirmData = { ...additionalParams };
    if (paymentMethod) {
        confirmData.payment_method = paymentMethod;
    }
    
    const data = await makeStripeRequest(`payment_intents/${paymentIntentId}/confirm`, stripeSecretKey, null, confirmData, 'POST');
    if (!data) {
        return `Failed to confirm Stripe payment intent: ${paymentIntentId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * Cancel a payment intent in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentIntentId - ID of the payment intent to cancel
 * @param {string} cancellationReason - Reason for cancellation
 * @returns {string} Formatted cancelled payment intent information
 */
async function cancelPaymentIntent(
    userId = null,
    paymentIntentId,
    cancellationReason = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Cancelling Stripe payment intent: ${paymentIntentId}`);
    
    const cancelData = {};
    if (cancellationReason) {
        cancelData.cancellation_reason = cancellationReason;
    }
    
    const data = await makeStripeRequest(`payment_intents/${paymentIntentId}/cancel`, stripeSecretKey, null, cancelData, 'POST');
    if (!data) {
        return `Failed to cancel Stripe payment intent: ${paymentIntentId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// CHARGE TOOLS
// =============================================================================

/**
 * Retrieve a charge from Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} chargeId - ID of the charge to retrieve
 * @returns {string} Formatted charge information
 */
async function retrieveCharge(userId = null, chargeId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Retrieving Stripe charge: ${chargeId}`);
    
    const data = await makeStripeRequest(`charges/${chargeId}`, stripeSecretKey);
    if (!data) {
        return `Failed to retrieve Stripe charge: ${chargeId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * List all charges in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of charges to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} customer - Filter by customer ID
 * @returns {string} Formatted charges list
 */
async function listCharges(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    customer = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe charges');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (customer) {
        params.customer = customer;
    }
    
    const data = await makeStripeRequest('charges', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe charges';
    }
    
    return formatStripeResponse(data);
}

/**
 * Capture a charge in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} chargeId - ID of the charge to capture
 * @param {number} amount - Amount to capture (optional, captures full amount if not specified)
 * @param {Object} additionalParams - Additional capture parameters
 * @returns {string} Formatted captured charge information
 */
async function captureCharge(
    userId = null,
    chargeId,
    amount = null,
    additionalParams = {}
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Capturing Stripe charge: ${chargeId}`);
    
    const captureData = { ...additionalParams };
    if (amount) {
        captureData.amount = amount;
    }
    
    const data = await makeStripeRequest(`charges/${chargeId}/capture`, stripeSecretKey, null, captureData, 'POST');
    if (!data) {
        return `Failed to capture Stripe charge: ${chargeId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// PAYMENT METHOD TOOLS
// =============================================================================

/**
 * Create a payment method in Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} type - Payment method type (e.g., 'card', 'sepa_debit')
 * @param {Object} paymentMethodData - Payment method data (card details, etc.)
 * @param {Object} metadata - Additional metadata
 * @returns {string} Formatted payment method information
 */
async function createPaymentMethod(
    userId = null,
    type,
    paymentMethodData,
    metadata = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Creating Stripe payment method of type: ${type}`);
    
    const createData = {
        type: type,
        [type]: paymentMethodData
    };
    
    if (metadata) {
        createData.metadata = metadata;
    }
    
    const data = await makeStripeRequest('payment_methods', stripeSecretKey, null, createData, 'POST');
    if (!data) {
        return 'Failed to create Stripe payment method';
    }
    
    return formatStripeResponse(data);
}

/**
 * Attach a payment method to a customer
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentMethodId - ID of the payment method to attach
 * @param {string} customerId - ID of the customer to attach to
 * @returns {string} Formatted payment method information
 */
async function attachPaymentMethod(
    userId = null,
    paymentMethodId,
    customerId
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Attaching payment method ${paymentMethodId} to customer ${customerId}`);
    
    const attachData = {
        customer: customerId
    };
    
    const data = await makeStripeRequest(`payment_methods/${paymentMethodId}/attach`, stripeSecretKey, null, attachData, 'POST');
    if (!data) {
        return `Failed to attach payment method ${paymentMethodId} to customer ${customerId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * Detach a payment method from a customer
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentMethodId - ID of the payment method to detach
 * @returns {string} Formatted payment method information
 */
async function detachPaymentMethod(
    userId = null,
    paymentMethodId
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Detaching payment method: ${paymentMethodId}`);
    
    const data = await makeStripeRequest(`payment_methods/${paymentMethodId}/detach`, stripeSecretKey, null, {}, 'POST');
    if (!data) {
        return `Failed to detach payment method: ${paymentMethodId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * List payment methods for a customer
 * @param {string} userId - User ID to get secret key from
 * @param {string} customerId - ID of the customer
 * @param {string} type - Payment method type to filter by (optional)
 * @param {number} limit - Maximum number of payment methods to return
 * @returns {string} Formatted payment methods list
 */
async function listPaymentMethods(
    userId = null,
    customerId,
    type = null,
    limit = 10
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Listing payment methods for customer: ${customerId}`);
    
    const params = {
        customer: customerId,
        limit: Math.min(limit, 100)
    };
    
    if (type) {
        params.type = type;
    }
    
    const data = await makeStripeRequest('payment_methods', stripeSecretKey, params);
    if (!data) {
        return `Failed to list payment methods for customer: ${customerId}`;
    }
    
    return formatStripeResponse(data);
}

/**
 * Retrieve a payment method
 * @param {string} userId - User ID to get secret key from
 * @param {string} paymentMethodId - ID of the payment method to retrieve
 * @returns {string} Formatted payment method information
 */
async function retrievePaymentMethod(
    userId = null,
    paymentMethodId
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Retrieving payment method: ${paymentMethodId}`);
    
    const data = await makeStripeRequest(`payment_methods/${paymentMethodId}`, stripeSecretKey);
    if (!data) {
        return `Failed to retrieve payment method: ${paymentMethodId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// EVENT AND WEBHOOK TOOLS
// =============================================================================

/**
 * List events from Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {number} limit - Maximum number of events to return (default: 10, max: 100)
 * @param {string} startingAfter - Pagination cursor for starting after
 * @param {string} endingBefore - Pagination cursor for ending before
 * @param {string} type - Filter by event type
 * @returns {string} Formatted events list
 */
async function listEvents(
    userId = null,
    limit = 10,
    startingAfter = null,
    endingBefore = null,
    type = null
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log('Fetching Stripe events');
    
    const params = { limit: Math.min(limit, 100) };
    if (startingAfter) {
        params.starting_after = startingAfter;
    }
    if (endingBefore) {
        params.ending_before = endingBefore;
    }
    if (type) {
        params.type = type;
    }
    
    const data = await makeStripeRequest('events', stripeSecretKey, params);
    if (!data) {
        return 'Failed to fetch Stripe events';
    }
    
    return formatStripeResponse(data);
}

/**
 * Retrieve an event from Stripe
 * @param {string} userId - User ID to get secret key from
 * @param {string} eventId - ID of the event to retrieve
 * @returns {string} Formatted event information
 */
async function retrieveEvent(
    userId = null,
    eventId
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Retrieving Stripe event: ${eventId}`);
    
    const data = await makeStripeRequest(`events/${eventId}`, stripeSecretKey);
    if (!data) {
        return `Failed to retrieve Stripe event: ${eventId}`;
    }
    
    return formatStripeResponse(data);
}

// =============================================================================
// DOCUMENTATION SEARCH TOOL
// =============================================================================

/**
 * Search Stripe documentation and knowledge base
 * @param {string} userId - User ID to get secret key from
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of results to return
 * @returns {string} Formatted search results
 */
async function searchDocumentation(
    userId = null,
    query,
    limit = 10
) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const stripeSecretKey = await getStripeSecretKey(userId);
    if (!stripeSecretKey) {
        return 'Error: Stripe secret key not found. Please configure your Stripe integration in your profile settings.';
    }

    console.log(`Searching Stripe documentation for: ${query}`);
    
    // Note: This is a placeholder implementation since Stripe doesn't provide
    // a direct API for documentation search. In a real implementation,
    // you might need to use a different approach or external service.
    
    return `Documentation search for '${query}' is not directly available through the Stripe API. Please visit https://docs.stripe.com for documentation search.`;
}

module.exports = {
    getStripeAccountInfo,
    retrieveBalance,
    createCoupon,
    listCoupons,
    createCustomer,
    listCustomers,
    listDisputes,
    updateDispute,
    createInvoice,
    createInvoiceItem,
    finalizeInvoice,
    listInvoices,
    createPaymentLink,
    listPaymentIntents,
    createPrice,
    listPrices,
    createProduct,
    listProducts,
    createRefund,
    cancelSubscription,
    listSubscriptions,
    updateSubscription,
    searchDocumentation,
    // Payment Intent tools
    createPaymentIntent,
    retrievePaymentIntent,
    confirmPaymentIntent,
    cancelPaymentIntent,
    // Charge tools
    retrieveCharge,
    listCharges,
    captureCharge,
    // Payment Method tools
    createPaymentMethod,
    attachPaymentMethod,
    detachPaymentMethod,
    listPaymentMethods,
    retrievePaymentMethod,
    // Event and Webhook tools
    listEvents,
    retrieveEvent
};