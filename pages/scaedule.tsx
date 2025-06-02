import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Initialize Firebase Admin SDK (ensure you have your service account JSON)
# Replace 'path/to/serviceAccount.json' with your actual path
def initialize_firestore():
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate('path/to/serviceAccount.json')
        firebase_admin.initialize_app(cred)
    return firestore.client()

# Fetch all documents in the 'school' collection and return a DataFrame

def fetch_school_data():
    db = initialize_firestore()
    docs = db.collection('school').stream()

    data = []
    for doc in docs:
        doc_id = doc.id
        fields = doc.to_dict()
        # Extract relevant fields (ensure they exist)
        brn = fields.get('사업자등록번호', '')
        ceo = fields.get('대표', '')
        address = fields.get('사업장주소', '')
        phone = fields.get('대표전화번호', '')
        bidder = fields.get('낙찰기업', '')
        school = fields.get('발주처', '')
        yyyymm = fields.get('연월', '')
        item = fields.get('품목', '')

        data.append({
            '문서ID': doc_id,
            '발주처': school,
            '사업자등록번호': brn,
            '대표': ceo,
            '사업장주소': address,
            '대표전화번호': phone,
            '낙찰기업': bidder,
            '연월': yyyymm,
            '품목': item
        })

    df = pd.DataFrame(data)
    return df

# Display table grouped by 발주처

def display_table_by_school(df):
    # Sort by 문서ID and 발주처 for readability
    df_sorted = df.sort_values(['문서ID', '발주처'])
    # Print full table; you can also pivot or group as needed
    print(df_sorted.to_string(index=False))

if __name__ == '__main__':
    df_school = fetch_school_data()
    display_table_by_school(df_school)
