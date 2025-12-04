/**
 * Shopify MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const Shopify = require('shopify-api-node');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

/**
 * Create Shopify API instance
 * @param {string} shopName - Shop name or domain
 * @param {string} accessToken - Shopify access token
 * @returns {Object|null} Shopify API instance
 */
function createShopifyInstance(shopName, accessToken) {
    try {
        return new Shopify({
            shopName: shopName,
            accessToken: accessToken,
            apiVersion: '2023-10'
        });
    } catch (error) {
        console.error('Shopify Instance Creation Error:', error.message);
        return null;
    }
}

/**
 * Get Shopify credentials from user's MCP data
 * @param {string} userId - User ID
 * @returns {Object|null} Shopify credentials or null if not found
 */
async function getShopifyCredentials(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.SHOPIFY) {
            return null;
        }
        
        const shopifyData = user.mcpdata.SHOPIFY;
        if (!shopifyData.access_token || !shopifyData.shop_name) {
            return null;
        }
        
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(shopifyData.access_token);
        return {
            shopName: shopifyData.shop_name,
            accessToken: decryptedToken
        };
    } catch (error) {
        console.error('Error fetching Shopify credentials:', error.message);
        return null;
    }
}

/**
 * List all products in the Shopify store
 * @param {string} userId - User ID to get credentials from
 * @param {number} limit - Maximum number of products to return
 * @param {string} status - Product status filter (active, archived, draft)
 * @returns {string} Formatted product list
 */
async function listShopifyProducts(userId = null, limit = 50, status = 'active') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const products = await shopify.product.list({ limit, status });
        
        if (products.length === 0) {
            return `No ${status} products found in the store.`;
        }
        
        let result = `Found ${products.length} ${status} products:\n\n`;
        for (const product of products) {
            const variantCount = product.variants ? product.variants.length : 0;
            const price = product.variants && product.variants[0] ? product.variants[0].price : 'N/A';
            
            result += `• **${product.title}**\n`;
            result += `  ID: ${product.id}\n`;
            result += `  Handle: ${product.handle}\n`;
            result += `  Status: ${product.status}\n`;
            result += `  Price: $${price}\n`;
            result += `  Variants: ${variantCount}\n`;
            result += `  Created: ${new Date(product.created_at).toLocaleDateString()}\n\n`;
        }
        
        return result;
    } catch (error) {
        return `Error fetching products: ${error.message}`;
    }
}

/**
 * Get detailed information about a specific product
 * @param {string} userId - User ID to get credentials from
 * @param {string} productId - Product ID
 * @returns {string} Formatted product details
 */
async function getShopifyProduct(userId = null, productId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const product = await shopify.product.get(productId);
        
        let result = `**Product Details: ${product.title}**\n\n`;
        result += `• **ID:** ${product.id}\n`;
        result += `• **Handle:** ${product.handle}\n`;
        result += `• **Status:** ${product.status}\n`;
        result += `• **Vendor:** ${product.vendor || 'N/A'}\n`;
        result += `• **Product Type:** ${product.product_type || 'N/A'}\n`;
        result += `• **Tags:** ${product.tags || 'None'}\n`;
        result += `• **Description:** ${product.body_html ? product.body_html.replace(/<[^>]*>/g, '') : 'No description'}\n`;
        result += `• **Created:** ${new Date(product.created_at).toLocaleDateString()}\n`;
        result += `• **Updated:** ${new Date(product.updated_at).toLocaleDateString()}\n\n`;
        
        if (product.variants && product.variants.length > 0) {
            result += `**Variants (${product.variants.length}):**\n`;
            for (const variant of product.variants) {
                result += `  - ${variant.title}: $${variant.price} (SKU: ${variant.sku || 'N/A'}, Inventory: ${variant.inventory_quantity || 0})\n`;
            }
        }
        
        return result;
    } catch (error) {
        return `Error fetching product: ${error.message}`;
    }
}

/**
 * Create a new product in Shopify
 * @param {string} userId - User ID to get credentials from
 * @param {string} title - Product title
 * @param {string} description - Product description
 * @param {string} vendor - Product vendor
 * @param {string} productType - Product type
 * @param {Array} variants - Product variants
 * @returns {string} Success or error message
 */
async function createShopifyProduct(userId = null, title, description = '', vendor = '', productType = '', variants = []) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const productData = {
            title,
            body_html: description,
            vendor,
            product_type: productType,
            status: 'active'
        };
        
        if (variants && variants.length > 0) {
            productData.variants = variants;
        }
        
        const product = await shopify.product.create(productData);
        
        return `Product "${product.title}" created successfully!\nProduct ID: ${product.id}\nHandle: ${product.handle}`;
    } catch (error) {
        return `Error creating product: ${error.message}`;
    }
}

/**
 * Update an existing product
 * @param {string} userId - User ID to get credentials from
 * @param {string} productId - Product ID to update
 * @param {Object} updateData - Data to update
 * @returns {string} Success or error message
 */
async function updateShopifyProduct(userId = null, productId, updateData) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const product = await shopify.product.update(productId, updateData);
        return `Product "${product.title}" updated successfully!`;
    } catch (error) {
        return `Error updating product: ${error.message}`;
    }
}

/**
 * Delete a product
 * @param {string} userId - User ID to get credentials from
 * @param {string} productId - Product ID to delete
 * @returns {string} Success or error message
 */
async function deleteShopifyProduct(userId = null, productId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        await shopify.product.delete(productId);
        return `Product with ID ${productId} deleted successfully!`;
    } catch (error) {
        return `Error deleting product: ${error.message}`;
    }
}

/**
 * List orders from the Shopify store
 * @param {string} userId - User ID to get credentials from
 * @param {number} limit - Maximum number of orders to return
 * @param {string} status - Order status filter
 * @returns {string} Formatted order list
 */
async function listShopifyOrders(userId = null, limit = 50, status = 'any') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const params = { limit };
        if (status !== 'any') {
            params.status = status;
        }
        
        const orders = await shopify.order.list(params);
        
        if (orders.length === 0) {
            return `No orders found with status: ${status}.`;
        }
        
        let result = `Found ${orders.length} orders:\n\n`;
        for (const order of orders) {
            const customerName = order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest';
            
            result += `• **Order #${order.order_number}**\n`;
            result += `  ID: ${order.id}\n`;
            result += `  Customer: ${customerName}\n`;
            result += `  Status: ${order.financial_status} / ${order.fulfillment_status || 'unfulfilled'}\n`;
            result += `  Total: $${order.total_price}\n`;
            result += `  Items: ${order.line_items.length}\n`;
            result += `  Created: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
        }
        
        return result;
    } catch (error) {
        return `Error fetching orders: ${error.message}`;
    }
}

/**
 * Get detailed information about a specific order
 * @param {string} userId - User ID to get credentials from
 * @param {string} orderId - Order ID
 * @returns {string} Formatted order details
 */
async function getShopifyOrder(userId = null, orderId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const order = await shopify.order.get(orderId);
        
        const customerName = order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest';
        const customerEmail = order.customer ? order.customer.email : order.email;
        
        let result = `**Order Details: #${order.order_number}**\n\n`;
        result += `• **ID:** ${order.id}\n`;
        result += `• **Customer:** ${customerName}\n`;
        result += `• **Email:** ${customerEmail}\n`;
        result += `• **Financial Status:** ${order.financial_status}\n`;
        result += `• **Fulfillment Status:** ${order.fulfillment_status || 'unfulfilled'}\n`;
        result += `• **Total Price:** $${order.total_price}\n`;
        result += `• **Subtotal:** $${order.subtotal_price}\n`;
        result += `• **Tax:** $${order.total_tax}\n`;
        result += `• **Shipping:** $${order.total_shipping_price_set ? order.total_shipping_price_set.shop_money.amount : '0.00'}\n`;
        result += `• **Created:** ${new Date(order.created_at).toLocaleDateString()}\n\n`;
        
        if (order.line_items && order.line_items.length > 0) {
            result += `**Line Items (${order.line_items.length}):**\n`;
            for (const item of order.line_items) {
                result += `  - ${item.title} x${item.quantity}: $${item.price}\n`;
                if (item.variant_title) {
                    result += `    Variant: ${item.variant_title}\n`;
                }
            }
        }
        
        if (order.shipping_address) {
            const addr = order.shipping_address;
            result += `\n**Shipping Address:**\n`;
            result += `${addr.first_name} ${addr.last_name}\n`;
            result += `${addr.address1}\n`;
            if (addr.address2) result += `${addr.address2}\n`;
            result += `${addr.city}, ${addr.province} ${addr.zip}\n`;
            result += `${addr.country}\n`;
        }
        
        return result;
    } catch (error) {
        return `Error fetching order: ${error.message}`;
    }
}

/**
 * List customers from the Shopify store
 * @param {string} userId - User ID to get credentials from
 * @param {number} limit - Maximum number of customers to return
 * @returns {string} Formatted customer list
 */
async function listShopifyCustomers(userId = null, limit = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const customers = await shopify.customer.list({ limit });
        
        if (customers.length === 0) {
            return 'No customers found in the store.';
        }
        
        let result = `Found ${customers.length} customers:\n\n`;
        for (const customer of customers) {
            const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'No name';
            const ordersCount = customer.orders_count || 0;
            const totalSpent = customer.total_spent || '0.00';
            
            result += `• **${name}**\n`;
            result += `  ID: ${customer.id}\n`;
            result += `  Email: ${customer.email}\n`;
            result += `  Orders: ${ordersCount}\n`;
            result += `  Total Spent: $${totalSpent}\n`;
            result += `  Created: ${new Date(customer.created_at).toLocaleDateString()}\n\n`;
        }
        
        return result;
    } catch (error) {
        return `Error fetching customers: ${error.message}`;
    }
}

/**
 * Get detailed information about a specific customer
 * @param {string} userId - User ID to get credentials from
 * @param {string} customerId - Customer ID
 * @returns {string} Formatted customer details
 */
async function getShopifyCustomer(userId = null, customerId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const customer = await shopify.customer.get(customerId);
        
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'No name';
        
        let result = `**Customer Details: ${name}**\n\n`;
        result += `• **ID:** ${customer.id}\n`;
        result += `• **Email:** ${customer.email}\n`;
        result += `• **Phone:** ${customer.phone || 'N/A'}\n`;
        result += `• **Orders Count:** ${customer.orders_count || 0}\n`;
        result += `• **Total Spent:** $${customer.total_spent || '0.00'}\n`;
        result += `• **State:** ${customer.state}\n`;
        result += `• **Accepts Marketing:** ${customer.accepts_marketing ? 'Yes' : 'No'}\n`;
        result += `• **Created:** ${new Date(customer.created_at).toLocaleDateString()}\n`;
        result += `• **Updated:** ${new Date(customer.updated_at).toLocaleDateString()}\n\n`;
        
        if (customer.default_address) {
            const addr = customer.default_address;
            result += `**Default Address:**\n`;
            result += `${addr.first_name} ${addr.last_name}\n`;
            result += `${addr.address1}\n`;
            if (addr.address2) result += `${addr.address2}\n`;
            result += `${addr.city}, ${addr.province} ${addr.zip}\n`;
            result += `${addr.country}\n`;
        }
        
        return result;
    } catch (error) {
        return `Error fetching customer: ${error.message}`;
    }
}

/**
 * Get shop information
 * @param {string} userId - User ID to get credentials from
 * @returns {string} Formatted shop information
 */
async function getShopifyShopInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const shop = await shopify.shop.get();
        
        let result = `**Shop Information: ${shop.name}**\n\n`;
        result += `• **ID:** ${shop.id}\n`;
        result += `• **Domain:** ${shop.domain}\n`;
        result += `• **Email:** ${shop.email}\n`;
        result += `• **Phone:** ${shop.phone || 'N/A'}\n`;
        result += `• **Address:** ${shop.address1}, ${shop.city}, ${shop.province} ${shop.zip}, ${shop.country}\n`;
        result += `• **Currency:** ${shop.currency}\n`;
        result += `• **Timezone:** ${shop.iana_timezone}\n`;
        result += `• **Plan:** ${shop.plan_name}\n`;
        result += `• **Created:** ${new Date(shop.created_at).toLocaleDateString()}\n`;
        result += `• **Updated:** ${new Date(shop.updated_at).toLocaleDateString()}\n`;
        
        return result;
    } catch (error) {
        return `Error fetching shop info: ${error.message}`;
    }
}

/**
 * Search products by title or other criteria
 * @param {string} userId - User ID to get credentials from
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {string} Formatted search results
 */
async function searchShopifyProducts(userId = null, query, limit = 20) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getShopifyCredentials(userId);
    if (!credentials) {
        return 'Error: Shopify credentials not found. Please configure your Shopify integration in your profile settings.';
    }
    
    const shopify = createShopifyInstance(credentials.shopName, credentials.accessToken);
    if (!shopify) {
        return 'Error: Failed to create Shopify connection.';
    }
    
    try {
        const products = await shopify.product.list({ 
            limit,
            title: query
        });
        
        if (products.length === 0) {
            return `No products found matching "${query}".`;
        }
        
        let result = `Found ${products.length} products matching "${query}":\n\n`;
        for (const product of products) {
            const price = product.variants && product.variants[0] ? product.variants[0].price : 'N/A';
            
            result += `• **${product.title}**\n`;
            result += `  ID: ${product.id}\n`;
            result += `  Handle: ${product.handle}\n`;
            result += `  Status: ${product.status}\n`;
            result += `  Price: $${price}\n\n`;
        }
        
        return result;
    } catch (error) {
        return `Error searching products: ${error.message}`;
    }
}

module.exports = {
    listShopifyProducts,
    getShopifyProduct,
    createShopifyProduct,
    updateShopifyProduct,
    deleteShopifyProduct,
    listShopifyOrders,
    getShopifyOrder,
    listShopifyCustomers,
    getShopifyCustomer,
    getShopifyShopInfo,
    searchShopifyProducts,
    getShopifyCredentials,
    createShopifyInstance
};