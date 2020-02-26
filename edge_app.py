"""
@author: denil gabani

"""

import cv2
import numpy as np
from inference import Network

#cpu extension path
CPU_EXTENSION = "/opt/intel/openvino/deployment_tools/inference_engine/lib/intel64/libcpu_extension_sse4.so"

#path of converted skin disease model in xml
MODEL = "model/model_tf.xml"

SKIN_CLASSES = {
  0: 'akiec, Actinic Keratoses (Solar Keratoses) or intraepithelial Carcinoma (Bowen’s disease)',
  1: 'bcc, Basal Cell Carcinoma',
  2: 'bkl, Benign Keratosis',
  3: 'df, Dermatofibroma',
  4: 'mel, Melanoma',
  5: 'nv, Melanocytic Nevi',
  6: 'vasc, Vascular skin lesion'

}


def preprocessing(input_image, height, width):

    image = np.copy(input_image)
    image = cv2.resize(image, (width, height))
    image = image.transpose((2,0,1))
    image = image.reshape(1, 3, height, width)

    return image



def pred_at_edge(input_img):

    # Initialize the Inference Engine
    plugin = Network()

    # Load the network model into the IE
    plugin.load_model(MODEL, "CPU", CPU_EXTENSION)
    net_input_shape = plugin.get_input_shape()
    # Reading input image
    img = cv2.imread(input_img, cv2.IMREAD_COLOR)

    # Pre-process the image
    expand_img = preprocessing(img, net_input_shape[2], net_input_shape[3])
    final_img=np.expand_dims(expand_img, axis=0)
    # Perform inference on the image
    plugin.async_inference(final_img)

    # Get the output of inference
    if plugin.wait() == 0:
        results = plugin.extract_output()
        pred=np.argmax(results)
        disease = SKIN_CLASSES[pred]
        accuracy = results[0][pred]
        print(disease, accuracy)
        return disease, accuracy
        
