import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const exportUtils = {
    // Export tasks to CSV
    exportToCSV: (tasks) => {
        const headers = ['Title', 'Description', 'Priority', 'Status', 'Due Date', 'Created At'];

        const csvData = tasks.map(task => [
            task.title,
            task.description || '',
            task.priority,
            task.status,
            format(new Date(task.dueDate), 'yyyy-MM-dd'),
            format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm')
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `quicktask-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Export tasks to PDF
    exportToPDF: (tasks, userName) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(99, 102, 241);
        doc.text('QuickTask - Task Report', 14, 22);

        // User info and date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`User: ${userName}`, 14, 32);
        doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 14, 38);
        doc.text(`Total Tasks: ${tasks.length}`, 14, 44);

        // Table
        const tableData = tasks.map(task => [
            task.title,
            task.priority,
            task.status,
            format(new Date(task.dueDate), 'MMM dd, yyyy'),
            task.description?.substring(0, 50) || '-'
        ]);

        doc.autoTable({
            head: [['Title', 'Priority', 'Status', 'Due Date', 'Description']],
            body: tableData,
            startY: 52,
            theme: 'grid',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 25 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 50 }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        doc.save(`quicktask-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }
};
