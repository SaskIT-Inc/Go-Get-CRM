import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, month } = await req.json();

    // Fetch data
    const serviceFilings = await base44.asServiceRole.entities.ServiceFiling.list();
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const pipelines = await base44.asServiceRole.entities.FilingPipeline.list();

    // Filter for selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const monthFilings = serviceFilings.filter(f => {
      const filedDate = f.filed_date ? new Date(f.filed_date) : null;
      return filedDate && filedDate >= startDate && filedDate <= endDate;
    });

    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= startDate && invDate <= endDate;
    });

    const monthPipelines = pipelines.filter(p => {
      const completedDate = p.final_confirmation_date ? new Date(p.final_confirmation_date) : null;
      return completedDate && completedDate >= startDate && completedDate <= endDate;
    });

    // Calculate metrics
    const totalFilings = monthFilings.length;
    const completedFilings = monthFilings.filter(f => f.status === 'Completed' || f.status === 'Filed').length;
    
    // Average turnaround time
    let totalTurnaroundDays = 0;
    let turnaroundCount = 0;
    
    monthPipelines.forEach(p => {
      if (p.created_date && p.final_confirmation_date) {
        const start = new Date(p.created_date);
        const end = new Date(p.final_confirmation_date);
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
        totalTurnaroundDays += days;
        turnaroundCount++;
      }
    });
    
    const avgTurnaroundTime = turnaroundCount > 0 ? Math.round(totalTurnaroundDays / turnaroundCount) : 0;

    // Revenue by service type
    const revenueByService = {};
    monthInvoices.forEach(inv => {
      const filing = serviceFilings.find(f => f.id === inv.service_filing_id);
      const serviceName = filing?.service_name || 'Other Services';
      revenueByService[serviceName] = (revenueByService[serviceName] || 0) + (inv.total_amount || 0);
    });

    const totalRevenue = Object.values(revenueByService).reduce((sum, val) => sum + val, 0);
    const totalPaid = monthInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

    // Filings by type
    const filingsByType = {};
    monthFilings.forEach(f => {
      const type = f.service_name || 'Other';
      filingsByType[type] = (filingsByType[type] || 0) + 1;
    });

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(25, 46, 91); // Navy
    doc.text('GoGet CRM', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(18);
    doc.text('Monthly Performance Report', 20, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setTextColor(100);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    doc.text(`${monthNames[month - 1]} ${year}`, 20, yPos);
    yPos += 15;

    // Key Metrics Section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Key Metrics', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(60);

    const metrics = [
      ['Total Filings:', totalFilings.toString()],
      ['Completed Filings:', completedFilings.toString()],
      ['Average Turnaround Time:', `${avgTurnaroundTime} days`],
      ['Total Revenue:', `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Amount Collected:', `$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Collection Rate:', `${totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%`]
    ];

    metrics.forEach(([label, value]) => {
      doc.text(label, 25, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(value, 100, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 8;
    });

    yPos += 10;

    // Revenue by Service Type
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Revenue by Service Type', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(60);

    // Table headers
    doc.setFont(undefined, 'bold');
    doc.text('Service', 25, yPos);
    doc.text('Revenue', 120, yPos);
    doc.text('% of Total', 160, yPos);
    yPos += 5;
    doc.line(25, yPos, 185, yPos);
    yPos += 5;

    doc.setFont(undefined, 'normal');

    Object.entries(revenueByService).forEach(([service, revenue]) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(service.substring(0, 35), 25, yPos);
      doc.text(`$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, yPos);
      doc.text(`${((revenue / totalRevenue) * 100).toFixed(1)}%`, 160, yPos);
      yPos += 8;
    });

    yPos += 10;

    // Filings by Service Type
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Filings by Service Type', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(60);

    // Table headers
    doc.setFont(undefined, 'bold');
    doc.text('Service Type', 25, yPos);
    doc.text('Count', 160, yPos);
    yPos += 5;
    doc.line(25, yPos, 185, yPos);
    yPos += 5;

    doc.setFont(undefined, 'normal');

    Object.entries(filingsByType).forEach(([type, count]) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(type.substring(0, 45), 25, yPos);
      doc.text(count.toString(), 160, yPos);
      yPos += 8;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Convert to blob and upload
    const pdfBlob = doc.output('blob');
    const fileName = `monthly_report_${year}_${month.toString().padStart(2, '0')}.pdf`;
    
    // Upload to storage
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({
      success: true,
      pdfUrl: uploadResult.file_url,
      metrics: {
        totalFilings,
        completedFilings,
        avgTurnaroundTime,
        totalRevenue,
        totalPaid
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});