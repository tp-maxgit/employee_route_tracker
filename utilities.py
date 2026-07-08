import math

def calculate_distance(lat1, lon1, lat2, lon2):
    
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_phi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def calculate_total_route_distance(coordinates):
    total_distance = 0.0
    
    for i in range(len(coordinates) - 1):
        total_distance += calculate_distance(
            coordinates[i].latitude, coordinates[i].longitude,
            coordinates[i+1].latitude, coordinates[i+1].longitude
        )
    return round(total_distance, 2)
     