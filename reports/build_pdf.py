from pathlib import Path

from weasyprint import HTML


root = Path(__file__).resolve().parent
HTML(filename=root / 'assignment_1_report.html', base_url=root).write_pdf(
    root / 'Harshdip_Saha_2023UCA1897_Assignment_1_IRS_Report.pdf')
