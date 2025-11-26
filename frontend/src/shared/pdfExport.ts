import { jsPDF } from 'jspdf';

// Helper function to format currency for PDF (avoiding Unicode issues)
function formatCurrencyForPDF(amount: number | string, formatCurrencyFn: (amount: string | number) => string): string {
	const formatted = formatCurrencyFn(amount);
	return formatted.replace(/дин\./g, 'RSD');
}

export interface AdminDashboardData {
	bikes: any[];
	batteries: any[];
	drivers: any[];
	rentals: any[];
	financialAnalytics: any;
	maintenanceRecords: any[];
	convertedTransactions: Record<string, number | null>;
	convertedMaintenance: Record<string, number | null>;
	formatCurrency: (amount: string | number) => string;
}

export interface DriverDashboardData {
	bikes: any[];
	rentals: any[];
}

export function exportAdminDashboardToPDF(data: AdminDashboardData) {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 15;
	let yPos = margin;
	const lineHeight = 7;
	const sectionSpacing = 10;

	// Helper function to add a new page if needed
	const checkPageBreak = (requiredSpace: number) => {
		if (yPos + requiredSpace > pageHeight - margin) {
			doc.addPage();
			yPos = margin;
		}
	};

	// Title
	doc.setFontSize(20);
	doc.setFont('helvetica', 'bold');
	doc.text('E-Bike Fleet Dashboard Report', pageWidth / 2, yPos, { align: 'center' });
	yPos += lineHeight * 2;

	// Date
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
	yPos += lineHeight + sectionSpacing;

	// Summary Cards Section
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text('Summary', margin, yPos);
	yPos += lineHeight + 2;

	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	
	const activeRentals = data.rentals.filter((r: any) => !r.end_date).length;
	const assignedBikes = data.bikes.filter((b: any) => b.assigned_profile_id).length;

	const summaryItems = [
		`Total Bikes: ${data.bikes.length} (${assignedBikes} assigned)`,
		`Total Batteries: ${data.batteries.length}`,
		`Total Drivers: ${data.drivers.length}`,
		`Active Rentals: ${activeRentals} (${data.rentals.length} total)`,
	];

	summaryItems.forEach((item) => {
		checkPageBreak(lineHeight);
		doc.text(`• ${item}`, margin + 5, yPos);
		yPos += lineHeight;
	});

	yPos += sectionSpacing;

	// Financial Overview Section
	checkPageBreak(lineHeight * 8);
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text('Financial Overview', margin, yPos);
	yPos += lineHeight + 2;

	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');

	const totalIncome = data.financialAnalytics?.summary?.total_income ?? "0";
	const totalExpenses = data.financialAnalytics?.summary?.total_expenses ?? "0";
	const netProfit = data.financialAnalytics?.summary?.net_profit ?? "0";
	const incomeCount = data.financialAnalytics?.summary?.income_count ?? 0;
	const expenseCount = data.financialAnalytics?.summary?.expense_count ?? 0;

	doc.text(`Total Income: ${formatCurrencyForPDF(totalIncome, data.formatCurrency)} (${incomeCount} transactions)`, margin + 5, yPos);
	yPos += lineHeight;
	doc.text(`Total Expenses: ${formatCurrencyForPDF(totalExpenses, data.formatCurrency)} (${expenseCount} transactions)`, margin + 5, yPos);
	yPos += lineHeight;
	doc.text(`Net Profit: ${formatCurrencyForPDF(netProfit, data.formatCurrency)}`, margin + 5, yPos);
	yPos += lineHeight + sectionSpacing;

	// Recent Transactions Table
	if (data.financialAnalytics?.transactions && data.financialAnalytics.transactions.length > 0) {
		checkPageBreak(lineHeight * 15);
		doc.setFontSize(12);
		doc.setFont('helvetica', 'bold');
		doc.text('Recent Transactions', margin, yPos);
		yPos += lineHeight + 2;

		// Table header
		doc.setFontSize(9);
		doc.setFont('helvetica', 'bold');
		const colWidths = [30, 25, 70, 40];
		const headers = ['Date', 'Type', 'Description', 'Amount'];
		let xPos = margin;
		headers.forEach((header, idx) => {
			doc.text(header, xPos, yPos);
			xPos += colWidths[idx];
		});
		yPos += lineHeight;

		// Table rows
		doc.setFont('helvetica', 'normal');
		data.financialAnalytics.transactions.slice(0, 20).forEach((tx: any) => {
			checkPageBreak(lineHeight * 2);
			xPos = margin;
			doc.text(new Date(tx.transaction_date).toLocaleDateString(), xPos, yPos);
			xPos += colWidths[0];
			doc.text(tx.transaction_type, xPos, yPos);
			xPos += colWidths[1];
			const description = (tx.description || '-').substring(0, 40);
			doc.text(description, xPos, yPos);
			xPos += colWidths[2];
			const convertedAmount = data.convertedTransactions[tx.id];
			const amountToFormat = convertedAmount !== undefined && convertedAmount !== null ? convertedAmount : tx.amount;
			const formattedAmount = formatCurrencyForPDF(amountToFormat, data.formatCurrency);
			const amountText = `${tx.transaction_type === 'income' ? '+' : '-'}${formattedAmount}`;
			doc.text(amountText, xPos, yPos);
			yPos += lineHeight;
		});
		yPos += sectionSpacing;
	}

	// Maintenance Records Section
	if (data.maintenanceRecords && data.maintenanceRecords.length > 0) {
		checkPageBreak(lineHeight * 15);
		doc.setFontSize(12);
		doc.setFont('helvetica', 'bold');
		doc.text('Recent Maintenance Records', margin, yPos);
		yPos += lineHeight + 2;

		// Table header
		doc.setFontSize(9);
		doc.setFont('helvetica', 'bold');
		const colWidths = [30, 20, 80, 40];
		const headers = ['Date', 'Item', 'Description', 'Cost'];
		let xPos = margin;
		headers.forEach((header, idx) => {
			doc.text(header, xPos, yPos);
			xPos += colWidths[idx];
		});
		yPos += lineHeight;

		// Table rows
		doc.setFont('helvetica', 'normal');
		data.maintenanceRecords.slice(0, 20).forEach((record: any) => {
			checkPageBreak(lineHeight * 2);
			xPos = margin;
			doc.text(new Date(record.service_date).toLocaleDateString(), xPos, yPos);
			xPos += colWidths[0];
			const itemType = record.bike_id ? 'Bike' : record.battery_id ? 'Battery' : '-';
			doc.text(itemType, xPos, yPos);
			xPos += colWidths[1];
			const description = record.description.substring(0, 50);
			doc.text(description, xPos, yPos);
			xPos += colWidths[2];
			const convertedCost = data.convertedMaintenance[record.id];
			const costToFormat = convertedCost !== undefined && convertedCost !== null ? convertedCost : record.cost;
			const cost = formatCurrencyForPDF(costToFormat, data.formatCurrency);
			doc.text(cost, xPos, yPos);
			yPos += lineHeight;
		});
	}

	// Save the PDF
	doc.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportDriverDashboardToPDF(data: DriverDashboardData) {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 15;
	let yPos = margin;
	const lineHeight = 7;
	const sectionSpacing = 10;

	// Helper function to add a new page if needed
	const checkPageBreak = (requiredSpace: number) => {
		if (yPos + requiredSpace > pageHeight - margin) {
			doc.addPage();
			yPos = margin;
		}
	};

	// Title
	doc.setFontSize(20);
	doc.setFont('helvetica', 'bold');
	doc.text('My E-Bike Dashboard Report', pageWidth / 2, yPos, { align: 'center' });
	yPos += lineHeight * 2;

	// Date
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
	yPos += lineHeight + sectionSpacing;

	// My Bikes Section
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(`My Bikes (${data.bikes.length})`, margin, yPos);
	yPos += lineHeight + 2;

	if (data.bikes.length === 0) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text('No bikes assigned.', margin + 5, yPos);
		yPos += lineHeight;
	} else {
		data.bikes.forEach((bike) => {
			checkPageBreak(lineHeight * 8);
			doc.setFontSize(11);
			doc.setFont('helvetica', 'bold');
			doc.text(`Bike: ${bike.serial_number}`, margin + 5, yPos);
			yPos += lineHeight;

			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			
			if (bike.make || bike.model) {
				doc.text(`Make/Model: ${[bike.make, bike.model].filter(Boolean).join(' ')}`, margin + 10, yPos);
				yPos += lineHeight;
			}
			
			if (bike.status) {
				doc.text(`Status: ${bike.status}`, margin + 10, yPos);
				yPos += lineHeight;
			}
			
			if (typeof bike.mileage === 'number') {
				doc.text(`Mileage: ${bike.mileage} km`, margin + 10, yPos);
				yPos += lineHeight;
			}
			
			if (bike.last_service_at) {
				doc.text(`Last Service: ${new Date(bike.last_service_at).toLocaleDateString()}`, margin + 10, yPos);
				yPos += lineHeight;
			}

			// Batteries
			if (bike.batteries && bike.batteries.length > 0) {
				doc.setFont('helvetica', 'bold');
				doc.text(`Batteries (${bike.batteries.length}):`, margin + 10, yPos);
				yPos += lineHeight;
				doc.setFont('helvetica', 'normal');
				
				bike.batteries.forEach((bat: any) => {
					checkPageBreak(lineHeight * 2);
					const batInfo = [
						bat.serial_number,
						typeof bat.charge_level === 'number' ? `${bat.charge_level}%` : null,
						typeof bat.capacity_wh === 'number' ? `${bat.capacity_wh} Wh` : null,
						bat.health_status || null,
						typeof bat.cycle_count === 'number' ? `${bat.cycle_count} cycles` : null,
						bat.status || null,
					].filter(Boolean).join(' | ');
					doc.text(`  • ${batInfo}`, margin + 15, yPos);
					yPos += lineHeight;
				});
			} else {
				doc.text('  No batteries assigned.', margin + 15, yPos);
				yPos += lineHeight;
			}

			yPos += sectionSpacing / 2;
		});
	}

	yPos += sectionSpacing;

	// My Rentals Section
	checkPageBreak(lineHeight * 10);
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(`My Rentals (${data.rentals.length})`, margin, yPos);
	yPos += lineHeight + 2;

	if (data.rentals.length === 0) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text('No rentals.', margin + 5, yPos);
		yPos += lineHeight;
	} else {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		
		data.rentals.forEach((rental) => {
			checkPageBreak(lineHeight * 4);
			const bike = data.bikes.find((b) => b.id === rental.bike_id);
			const isOngoing = !rental.end_date;
			const startDate = new Date(rental.start_date).toLocaleDateString();
			const endDate = rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing';

			doc.setFont('helvetica', 'bold');
			doc.text(`Bike: ${bike?.serial_number ?? 'Unknown bike'}`, margin + 5, yPos);
			yPos += lineHeight;
			
			doc.setFont('helvetica', 'normal');
			doc.text(`Period: ${startDate} - ${endDate}`, margin + 10, yPos);
			yPos += lineHeight;
			doc.text(`Status: ${isOngoing ? 'Active' : 'Completed'}`, margin + 10, yPos);
			yPos += lineHeight;
			
			if (rental.notes) {
				doc.text(`Notes: ${rental.notes}`, margin + 10, yPos);
				yPos += lineHeight;
			}

			yPos += sectionSpacing / 2;
		});
	}

	// Save the PDF
	doc.save(`my-dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

