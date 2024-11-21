import os
import random
import requests
import numpy as np
import pandas as pd
from tqdm.notebook import tqdm
from PIL import Image
from io import BytesIO
from IPython.display import display, Image as IPImage
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from transformers import CLIPProcessor, CLIPModel
import torch

file_path = "wornwear.xlsx"
df = pd.read_excel(file_path)

image_dir = "images"
os.makedirs(image_dir, exist_ok=True)

# download img from url
def download_image(url, save_dir, index):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            # If the image is in RGBA mode, it caan cause an error
            if img.mode == 'RGBA':
                # white background
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])  
                img = background
            image_path = os.path.join(save_dir, f"image_{index}.jpg")
            img.save(image_path)
            return image_path
        else:
            return None
    except Exception as e:
        print(f"Error downloading image {index}: {e}")
        return None

# iterate through the df and download
image_paths = []
for i, url in tqdm(enumerate(df.iloc[:, 0]), desc="Downloading Images", total=len(df)):
    image_path = download_image(url, image_dir, i)
    image_paths.append(image_path)

# add path to df
df['image_path'] = image_paths

filtered_df = df.dropna(subset=['image_path', 'full-unstyled-link'])
print(f"Filtered DataFrame contains {len(filtered_df)} rows (removed {len(df) - len(filtered_df)} rows).")

df=filtered_df

# Load models <<These may be changed>>
text_model = SentenceTransformer('all-MiniLM-L6-v2')
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# text embed
def get_text_embedding(text):
    return text_model.encode(text)

# img embed
def get_image_embedding(image_path):
    try:
        image = Image.open(image_path).convert("RGB")
        inputs = clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            image_embedding = clip_model.get_image_features(**inputs)
        return image_embedding.squeeze().numpy()
    except Exception as e:
        print(f"Error processing image file: {image_path}, Error: {e}")
        return None

def normalize_embedding(embedding):
    norm = np.linalg.norm(embedding)
    if norm == 0:  # Min-max norm better ? 
        return embedding
    return embedding / norm

# init
text_embeddings = []
image_embeddings = []

for i, row in tqdm(df.iterrows(), desc="Generating Embeddings", total=len(df)):
    description = row['full-unstyled-link']  
    image_path = row['image_path']  

    # generate embed
    text_embed = get_text_embedding(description)
    image_embed = get_image_embedding(image_path)

    if text_embed is not None and image_embed is not None:
        text_embeddings.append(text_embed)
        image_embeddings.append(image_embed)

# Concat embed
item_embeddings = []
for text_embed, image_embed in zip(text_embeddings, image_embeddings):
    if text_embed is not None and image_embed is not None:
        # we normalize embeddings so neither of the text or image embeddings dominate the concat vector
        text_embed = normalize_embedding(text_embed)
        image_embed = normalize_embedding(image_embed)
        combined_embedding = np.concatenate([text_embed, image_embed])
        item_embeddings.append(combined_embedding)
    else:
        print("Invalid embedding ?!")


# Add embed to df
df['embedding'] = item_embeddings
df.to_pickle("embeds.pkl")