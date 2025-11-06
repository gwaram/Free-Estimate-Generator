import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS and logging middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use('*', logger(console.log));

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper function to get user from access token
async function getUserFromToken(accessToken: string) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error) throw error;
    return user;
  } catch (error) {
    console.log('Auth error:', error);
    return null;
  }
}

// Routes
app.get('/make-server-f05748ee/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User registration
app.post('/make-server-f05748ee/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      message: 'User created successfully',
      user: { id: data.user.id, email: data.user.email, name }
    });

  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get user suppliers
app.get('/make-server-f05748ee/suppliers', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const suppliers = await kv.get(`user_suppliers_${user.id}`) || [];
    return c.json({ suppliers });

  } catch (error) {
    console.log('Get suppliers error:', error);
    return c.json({ error: 'Error fetching suppliers' }, 500);
  }
});

// Save supplier
app.post('/make-server-f05748ee/suppliers', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const supplier = await c.req.json();
    if (!supplier.companyName) {
      return c.json({ error: 'Company name is required' }, 400);
    }

    const existingSuppliers = await kv.get(`user_suppliers_${user.id}`) || [];
    const supplierIndex = existingSuppliers.findIndex((s: any) => s.companyName === supplier.companyName);
    
    if (supplierIndex >= 0) {
      existingSuppliers[supplierIndex] = supplier;
    } else {
      existingSuppliers.push(supplier);
    }

    await kv.set(`user_suppliers_${user.id}`, existingSuppliers);
    
    return c.json({ 
      message: 'Supplier saved successfully',
      suppliers: existingSuppliers 
    });

  } catch (error) {
    console.log('Save supplier error:', error);
    return c.json({ error: 'Error saving supplier' }, 500);
  }
});

// Get user item templates
app.get('/make-server-f05748ee/item-templates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const itemTemplates = await kv.get(`user_item_templates_${user.id}`) || [];
    return c.json({ itemTemplates });

  } catch (error) {
    console.log('Get item templates error:', error);
    return c.json({ error: 'Error fetching item templates' }, 500);
  }
});

// Save item template
app.post('/make-server-f05748ee/item-templates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const itemTemplate = await c.req.json();
    if (!itemTemplate.name) {
      return c.json({ error: 'Item name is required' }, 400);
    }

    const existingTemplates = await kv.get(`user_item_templates_${user.id}`) || [];
    const templateIndex = existingTemplates.findIndex((t: any) => t.name === itemTemplate.name);
    
    if (templateIndex >= 0) {
      existingTemplates[templateIndex] = itemTemplate;
    } else {
      existingTemplates.push(itemTemplate);
    }

    await kv.set(`user_item_templates_${user.id}`, existingTemplates);
    
    return c.json({ 
      message: 'Item template saved successfully',
      itemTemplates: existingTemplates 
    });

  } catch (error) {
    console.log('Save item template error:', error);
    return c.json({ error: 'Error saving item template' }, 500);
  }
});

// Delete item template
app.delete('/make-server-f05748ee/item-templates/:name', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const templateName = c.req.param('name');
    const existingTemplates = await kv.get(`user_item_templates_${user.id}`) || [];
    const filteredTemplates = existingTemplates.filter((t: any) => t.name !== templateName);

    await kv.set(`user_item_templates_${user.id}`, filteredTemplates);
    
    return c.json({ 
      message: 'Item template deleted successfully',
      itemTemplates: filteredTemplates 
    });

  } catch (error) {
    console.log('Delete item template error:', error);
    return c.json({ error: 'Error deleting item template' }, 500);
  }
});

// Get user estimates
app.get('/make-server-f05748ee/estimates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const estimates = await kv.get(`user_estimates_${user.id}`) || [];
    return c.json({ estimates });

  } catch (error) {
    console.log('Get estimates error:', error);
    return c.json({ error: 'Error fetching estimates' }, 500);
  }
});

// Save estimate
app.post('/make-server-f05748ee/estimates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const estimateData = await c.req.json();
    if (!estimateData.estimateNumber || !estimateData.clientName) {
      return c.json({ error: 'Estimate number and client name are required' }, 400);
    }

    const estimate = {
      ...estimateData,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingEstimates = await kv.get(`user_estimates_${user.id}`) || [];
    existingEstimates.unshift(estimate); // Add to beginning

    await kv.set(`user_estimates_${user.id}`, existingEstimates);
    
    return c.json({ 
      message: 'Estimate saved successfully',
      estimate
    });

  } catch (error) {
    console.log('Save estimate error:', error);
    return c.json({ error: 'Error saving estimate' }, 500);
  }
});

// Update estimate
app.put('/make-server-f05748ee/estimates/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const estimateId = c.req.param('id');
    const estimateData = await c.req.json();

    const existingEstimates = await kv.get(`user_estimates_${user.id}`) || [];
    const estimateIndex = existingEstimates.findIndex((e: any) => e.id === estimateId);
    
    if (estimateIndex === -1) {
      return c.json({ error: 'Estimate not found' }, 404);
    }

    existingEstimates[estimateIndex] = {
      ...estimateData,
      id: estimateId,
      createdAt: existingEstimates[estimateIndex].createdAt,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user_estimates_${user.id}`, existingEstimates);
    
    return c.json({ 
      message: 'Estimate updated successfully',
      estimate: existingEstimates[estimateIndex]
    });

  } catch (error) {
    console.log('Update estimate error:', error);
    return c.json({ error: 'Error updating estimate' }, 500);
  }
});

// Delete estimate
app.delete('/make-server-f05748ee/estimates/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const estimateId = c.req.param('id');
    const existingEstimates = await kv.get(`user_estimates_${user.id}`) || [];
    const filteredEstimates = existingEstimates.filter((e: any) => e.id !== estimateId);

    await kv.set(`user_estimates_${user.id}`, filteredEstimates);
    
    return c.json({ 
      message: 'Estimate deleted successfully',
      estimates: filteredEstimates 
    });

  } catch (error) {
    console.log('Delete estimate error:', error);
    return c.json({ error: 'Error deleting estimate' }, 500);
  }
});

// Get user clients
app.get('/make-server-f05748ee/clients', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const clients = await kv.get(`user_clients_${user.id}`) || [];
    return c.json({ clients });

  } catch (error) {
    console.log('Get clients error:', error);
    return c.json({ error: 'Error fetching clients' }, 500);
  }
});

// Save client
app.post('/make-server-f05748ee/clients', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const client = await c.req.json();
    if (!client.name) {
      return c.json({ error: 'Client name is required' }, 400);
    }

    const existingClients = await kv.get(`user_clients_${user.id}`) || [];
    const clientIndex = existingClients.findIndex((c: any) => c.name === client.name);
    
    if (clientIndex >= 0) {
      existingClients[clientIndex] = client;
    } else {
      existingClients.push(client);
    }

    await kv.set(`user_clients_${user.id}`, existingClients);
    
    return c.json({ 
      message: 'Client saved successfully',
      clients: existingClients 
    });

  } catch (error) {
    console.log('Save client error:', error);
    return c.json({ error: 'Error saving client' }, 500);
  }
});

// Delete supplier
app.delete('/make-server-f05748ee/suppliers/:companyName', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const companyName = decodeURIComponent(c.req.param('companyName'));
    const existingSuppliers = await kv.get(`user_suppliers_${user.id}`) || [];
    const filteredSuppliers = existingSuppliers.filter((s: any) => s.companyName !== companyName);

    await kv.set(`user_suppliers_${user.id}`, filteredSuppliers);
    
    return c.json({ 
      message: 'Supplier deleted successfully',
      suppliers: filteredSuppliers 
    });

  } catch (error) {
    console.log('Delete supplier error:', error);
    return c.json({ error: 'Error deleting supplier' }, 500);
  }
});

// Delete client
app.delete('/make-server-f05748ee/clients/:clientName', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const clientName = decodeURIComponent(c.req.param('clientName'));
    const existingClients = await kv.get(`user_clients_${user.id}`) || [];
    const filteredClients = existingClients.filter((c: any) => c.name !== clientName);

    await kv.set(`user_clients_${user.id}`, filteredClients);
    
    return c.json({ 
      message: 'Client deleted successfully',
      clients: filteredClients 
    });

  } catch (error) {
    console.log('Delete client error:', error);
    return c.json({ error: 'Error deleting client' }, 500);
  }
});

export default app;

Deno.serve(app.fetch);