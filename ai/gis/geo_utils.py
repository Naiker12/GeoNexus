"""GIS utilities placeholder using GeoPandas/Shapely."""
import geopandas as gpd

def read_vector(path: str) -> gpd.GeoDataFrame:
    return gpd.read_file(path)
