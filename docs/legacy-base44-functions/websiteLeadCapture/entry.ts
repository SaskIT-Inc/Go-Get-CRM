import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Public webhook endpoint for website lead capture
// Handles: main contact form, offer149 eligibility form, consultation booking
// POST /websiteLeadCapture
// CORS-enabled for go-get.ca and website-go-get-ca.base44.app
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      // Core contact fields
      contact_name,
      full_name,           // alias from website form
      email,
      phone,
      company_name,
      business_name,       // alias from website form
      
      // Lead classification
      lead_type,           // 'Individual' | 'Business'
      industry,            // industry/business type from website
      business_type,       // business type
      pipeline_type,       // 'Hot Lead' | 'Cold Lead'
      form_source,         // 'contact_form' | 'offer149' | 'consultation' | 'checklist'
      
      // Services & needs
      services_interested,
      how_can_we_help,     // message from contact form
      message,
      notes,
      
      // Eligibility (offer149 form)
      location,            // 'Saskatoon, SK' | 'Regina, SK' | etc.
      business_size,       // 'Just me...' | 'I have a small business...' etc.
      accounting_situation,// 'Brand new' | 'Switching' | etc.
      
      // Appointment booking
      preferred_date,
      preferred_time,
      meeting_type,        // 'Online (Google Meet)' | 'In-Person'
      
      // Urgency
      urgency,
    } = body;

    const resolvedName = contact_name || full_name || '';
    const resolvedCompany = company_name || business_name || '';

    if (!resolvedName || !email) {
      return Response.json(
        { error: 'contact_name (or full_name) and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const base44 = createClientFromRequest(req);

    // Build notes summary from all captured data
    const notesParts = [];
    if (how_can_we_help || message) notesParts.push(`Message: ${how_can_we_help || message}`);
    if (form_source) notesParts.push(`Form: ${form_source}`);
    if (location) notesParts.push(`Location: ${location}`);
    if (business_size) notesParts.push(`Business Size: ${business_size}`);
    if (accounting_situation) notesParts.push(`Accounting Situation: ${accounting_situation}`);
    if (preferred_date) notesParts.push(`Preferred Date: ${preferred_date}`);
    if (preferred_time) notesParts.push(`Preferred Time: ${preferred_time}`);
    if (meeting_type) notesParts.push(`Meeting Type: ${meeting_type}`);
    if (notes) notesParts.push(notes);

    // Determine pipeline type from form source
    let resolvedPipeline = pipeline_type || 'Hot Lead';
    if (form_source === 'offer149') resolvedPipeline = 'Hot Lead';
    if (form_source === 'consultation') resolvedPipeline = 'Hot Lead';

    // Map industry from website dropdown values to our standard
    const industryMap = {
      'Indigenous Business': 'Indigenous Business',
      'Automotive': 'Automotive (Repair Shop / Dealership / Parts)',
      'Construction': 'Construction & Real Estate',
      'Contractors': 'Independent Contractor (Plumber / Electrician / HVAC / Painter / Roofer)',
      'CareHomes': 'Child Care',
      'Gyms': 'Gym, Fitness & Beauty',
      'Restaurants': 'Restaurant & Café',
      'WomenEntrepreneurs': 'Women-Led Business',
      'Retail': 'Gas Station & Convenience Store',
    };
    const resolvedIndustry = industryMap[industry] || industry || '';

    // Determine urgency from appointment booking or eligibility
    let resolvedUrgency = urgency || 'This Month';
    if (preferred_date) resolvedUrgency = 'This Week';
    if (form_source === 'offer149') resolvedUrgency = 'Immediate';

    const lead = await base44.asServiceRole.entities.Lead.create({
      contact_name: resolvedName,
      email,
      phone: phone || '',
      company_name: resolvedCompany,
      lead_type: lead_type || (resolvedCompany ? 'Business' : 'Individual'),
      pipeline_type: resolvedPipeline,
      lead_source: 'Website',
      stage: 'New Lead',
      services_interested: services_interested || [],
      notes: notesParts.join('\n'),
      urgency: resolvedUrgency,
      probability: form_source === 'offer149' ? 70 : 50,
    });

    console.log(`New ${resolvedPipeline} captured from website: ${resolvedName} (${email}) via ${form_source || 'contact_form'}`);

    return Response.json(
      { success: true, lead_id: lead.id, message: 'Lead captured successfully' },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Website lead capture error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});