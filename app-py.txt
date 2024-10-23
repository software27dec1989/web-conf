from flask import Flask, render_template, request, jsonify
import requests
import time
import re

app = Flask(__name__)

# Configuration
confluence_url = "https://abc-confluence.systems.uk.asdc/confluence"
parent_page_id = "065625"
bearer_token = "your_bearer_token"

# Headers for authentication
headers = {
    "Authorization": f"Bearer {bearer_token}",
    "Content-Type": "application/json"
}

# Function to get all child pages
def get_all_child_pages():
    api_url = f"{confluence_url}/rest/api/content/{parent_page_id}/child/page"
    child_pages = []
    retry_attempts = 5
    while api_url:
        for attempt in range(retry_attempts):
            response = requests.get(api_url, headers=headers)
            if response.status_code == 200:
                response_data = response.json()
                child_pages.extend(response_data.get("results", []))
                next_page_url = response_data.get("_links", {}).get("next")
                if next_page_url:
                    api_url = confluence_url + next_page_url
                else:
                    api_url = None
                break
            elif response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 10))
                time.sleep(retry_after)
            else:
                break
    return child_pages

# Function to extract change number from the title
def extract_change_number(title):
    match = re.search(r'(CHG|CR)\d+', title)
    if match:
        return match.group(0)
    return None

# Function to search for a page by change number
def search_page_by_change_number(child_pages, change_number):
    for page in child_pages:
        title = page.get("title")
        webui = page.get("_links", {}).get("webui")
        if webui:
            full_link = confluence_url + webui
            extracted_change_number = extract_change_number(title)
            if extracted_change_number == change_number:
                return {"title": title, "link": full_link}
    return None

# Function to call the patch API
def patch_api(cr_number, update_data):
    url = f'https://cie.it.glocal.xyzc/cie/api/v2/changes/{cr_number}'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_token'
    }
    data = {
        "change": {
            "businessApprovalUrl": update_data,
            "independentCodeReviewUrl": update_data,
            "testEvidenceUrl": update_data,
            "artifacts": {
                "artifacts": [
                    {
                        "artifactName": "Artifact1",
                        "regressionTestType": 'Partial',
                        "resgressionTestJustification": 'Required Justification for Partial test',
                        "codeReviewUrl": update_data,
                        "sourceCodeUrl": update_data,
                        "manualRegressionTestUrls": [update_data]
                    }
                ]
            },
            "postDeploymentVerificationEvidenceUrl": update_data,
            "manualRegressionTestUrls": [update_data]
        },
        "fieldsToUpdate": [
            "independentCodeReviewUrl",
            "businessApprovalUrl",
            "testEvidenceUrl",
            "postDeploymentVerificationEvidenceUrl",
            "manualRegressionTestUrls",
            "performanceStressTestEvidenceUrl",
            "artifacts"
        ]
    }
    try:
        response = requests.patch(url, headers=headers, json=data)
        if response.status_code == 200:
            return {"status": "success", "message": f"Successfully updated Change Number: {cr_number}"}
        else:
            return {"status": "failure", "message": f"Failed to update {cr_number}: {response.status_code}"}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": str(e)}

# Flask route to render the homepage
@app.route('/')
def home():
    return render_template('index.html')

# Flask route to handle the form submission
@app.route('/submit', methods=['POST'])
def submit():
    change_numbers = request.json.get('change_numbers')
    if not change_numbers:
        return jsonify({"status": "error", "message": "No change numbers provided."})

    change_numbers = [num.strip() for num in change_numbers.split(",")]
    child_pages = get_all_child_pages()

    results = []
    for change_number in change_numbers:
        confluence_page = search_page_by_change_number(child_pages, change_number)
        if confluence_page:
            patch_result = patch_api(change_number, confluence_page['link'])
            results.append({
                "change_number": change_number,
                "confluence_page": confluence_page,
                "patch_result": patch_result
            })
        else:
            results.append({"change_number": change_number, "message": "No page found."})

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
