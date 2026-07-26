import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, clientId, tasks, summary, clients, users } = await req.json();

    console.log(`Generating monthly task report for ${month}`);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Helper function to check page overflow
    const checkPageOverflow = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Task Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const monthName = new Date(month + '-01').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    doc.text(monthName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary Section
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Completed Tasks: ${summary.totalTasks}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Hours Logged: ${summary.totalHours.toFixed(1)} hrs`, 20, yPos);
    yPos += 6;
    doc.text(`Estimated Hours: ${summary.estimatedHours.toFixed(1)} hrs`, 20, yPos);
    yPos += 6;
    doc.text(`Tasks with Client: ${summary.tasksWithClient}`, 20, yPos);
    yPos += 12;

    // Client Breakdown
    checkPageOverflow(30);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Breakdown by Client', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Client', 20, yPos);
    doc.text('Tasks', 100, yPos);
    doc.text('Hours', 140, yPos);
    yPos += 5;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    doc.setFont(undefined, 'normal');
    for (const [clientId, data] of Object.entries(summary.byClient)) {
      checkPageOverflow(8);
      const client = clients.find(c => c.id === clientId);
      const clientName = client?.legal_name || 'Unassigned';
      const avgHours = data.hours / data.tasks.length;

      doc.text(clientName.substring(0, 35), 20, yPos);
      doc.text(data.tasks.length.toString(), 100, yPos);
      doc.text(`${data.hours.toFixed(1)} hrs`, 140, yPos);
      yPos += 6;
    }
    yPos += 8;

    // Team Member Breakdown
    checkPageOverflow(30);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Breakdown by Team Member', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Team Member', 20, yPos);
    doc.text('Tasks', 100, yPos);
    doc.text('Hours', 140, yPos);
    yPos += 5;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    doc.setFont(undefined, 'normal');
    for (const [email, data] of Object.entries(summary.byAssignee)) {
      checkPageOverflow(8);
      const user = users.find(u => u.email === email);
      const userName = user?.full_name || email || 'Unassigned';
      const productivity = ((data.hours / summary.totalHours) * 100).toFixed(0);

      doc.text(userName.substring(0, 35), 20, yPos);
      doc.text(data.tasks.length.toString(), 100, yPos);
      doc.text(`${data.hours.toFixed(1)} hrs (${productivity}%)`, 140, yPos);
      yPos += 6;
    }
    yPos += 10;

    // Task Details
    checkPageOverflow(30);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Task Details', 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    for (const task of tasks) {
      checkPageOverflow(20);
      
      const client = clients.find(c => c.id === task.client_id);
      const assignee = users.find(u => u.email === task.assigned_to);
      
      doc.setFont(undefined, 'bold');
      doc.text(task.title.substring(0, 70), 20, yPos);
      yPos += 5;

      doc.setFont(undefined, 'normal');
      doc.text(`Client: ${client?.legal_name || 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`Assignee: ${assignee?.full_name || task.assigned_to || 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`Completed: ${task.completed_date ? new Date(task.completed_date).toLocaleDateString() : 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`Hours: ${task.actual_hours || 0} (Est: ${task.estimated_hours || 0})`, 20, yPos);
      yPos += 8;
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    // Upload to storage
    const fileName = `monthly-task-report-${month}-${Date.now()}.pdf`;
    const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
    
    const uploadResult = await base44.integrations.Core.UploadFile({ file });

    console.log('PDF report generated and uploaded:', uploadResult.file_url);

    return Response.json({
      success: true,
      pdf_url: uploadResult.file_url,
      file_name: fileName
    });

  } catch (error) {
    console.error('Error generating monthly task report:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});