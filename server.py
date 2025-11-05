from deepface import DeepFace
from flask import request,Flask

app = Flask(__name__)


def recog(img1,img2):
    try:
        result = DeepFace.verify(img1_path=img1, img2_path=img2)
        print(result) # Provides more details like distance, threshold, etc.
        if result["verified"]:
            return True
        else:
            return False        
    except ValueError as e:
        print(f"Error: {e}. Ensure faces are detectable in both images.")

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        if request.is_json:
            request_data = request.get_json()
            image1 = request_data['img1']
            image2 = request_data['img2']
            prediction = recog(image1,image2)           
            return 1 if prediction else 0
        
if __name__ == '__main__':
    app.run(host='0.0.0.0',port=3000,debug=True)
    