import base64

def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return encoded_string

# Example usage
image_path = "w.jpg"  # Replace with your image file path
encoded_image = encode_image_to_base64(image_path)
print(encoded_image)
