import fs from 'fs';
import pdf from 'html-pdf';
const html = fs.readFileSync('./scripts/test/businesscard.html', 'utf8');
const options = { format: 'Letter' };

pdf.create(html, options).toFile('./scripts/businesscard.pdf', (err, res) => {
	if (err) return console.log(err);
	console.log(res);
});
