import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

def flag_anomalous_coordinates(coords_list):

    if len(coords_list) < 5:
        return []
    
    df=pd.DataFrame(coords_list)

    X=df[['latitude' , 'longitude']]


    model=IsolationForest(contamination=0.05, random_state=42)

    df['anomaly_score']=model.fit_predict(X)

    outliers=df[df['anomaly_score'] == -1]

    return outliers['id'].tolist()

if __name__ == "__main__":
    
    mock_route_data = [
        {"id": 101, "latitude": 26.9124, "longitude": 75.7873}, 
        {"id": 102, "latitude": 26.9125, "longitude": 75.7874}, 
        {"id": 103, "latitude": 26.9126, "longitude": 75.7875}, 
        {"id": 104, "latitude": 26.9127, "longitude": 75.7876}, 
        {"id": 105, "latitude": 26.9128, "longitude": 75.7877}, 
        {"id": 999, "latitude": 29.7041, "longitude": 77.1025}, 
        {"id": 452, "latitude": 29.0473, "longitude": 77.9821},
        {"id": 322, "latitude": 28.0873, "longitude": 77.8673},
    ]

    print("Running Isolation Forest Analysis...")
    flagged_ids = flag_anomalous_coordinates(mock_route_data)
    
    print(f"The algorithm successfully isolated these coordinate IDs: {flagged_ids}")
