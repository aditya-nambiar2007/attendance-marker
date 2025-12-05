from deepface import DeepFace
import argparse

def recog(img1,img2):
    try:
        result = DeepFace.verify(img1_path=img1, img2_path=img2)
        if result["verified"]:
            print(True)
        else:
            print(False)
    except Exception as e:
        # Print errors to stderr to separate them from normal output
        print(False)
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify if two images contain the same face.")
    parser.add_argument("img1_path", help="Path or URI to the first image.")
    parser.add_argument("img2_path", help="Path or URI to the second image.")
    args = parser.parse_args()
    recog(args.img1_path, args.img2_path)