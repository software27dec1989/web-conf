document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('changeForm');
    const resultsContainer = document.getElementById('results');

    form.addEventListener('submit', function (event) {
        event.preventDefault();  // Prevent the form from submitting traditionally
        
        const changeNumbers = document.getElementById('changeNumbers').value;

        fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ change_numbers: changeNumbers }),
        })
        .then(response => response.json())
        .then(data => {
            resultsContainer.innerHTML = '';  // Clear previous results
            
            data.forEach(result => {
                const resultDiv = document.createElement('div');
                resultDiv.innerHTML = `
                    <p><strong>Change Number:</strong> ${result.change_number}</p>
                    <p><strong>Status:</strong> ${result.patch_result ? result.patch_result.status : 'No page found'}</p>
                    <hr>
                `;
                resultsContainer.appendChild(resultDiv);
            });
        })
        .catch(error => console.error('Error:', error));
    });
});
