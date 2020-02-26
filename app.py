"""
@author: denil gabani

"""
from flask import render_template, Flask, request
from edge_app import pred_at_edge
import time

app = Flask(__name__)

SKIN_CLASSES = {
  0: 'akiec, Actinic Keratoses (Solar Keratoses) or intraepithelial Carcinoma (Bowen’s disease)',
  1: 'bcc, Basal Cell Carcinoma',
  2: 'bkl, Benign Keratosis',
  3: 'df, Dermatofibroma',
  4: 'mel, Melanoma',
  5: 'nv, Melanocytic Nevi',
  6: 'vasc, Vascular skin lesion'

}

@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/uploaded', methods = ['GET', 'POST'])
def upload_file():
    start = time.time()
    if request.method == 'POST':
        skin_image = request.files['file']
        path='static/data/'+skin_image.filename
        skin_image.save(path)
        disease, accuracy= pred_at_edge(path)
    end = time.time()
    return render_template('uploaded.html', title='Success', predictions=disease, acc=accuracy, img_file=skin_image.filename,time_diff=end-start)

if __name__ == "__main__":
    app.run()