# Import ogr and gdal depending on system
try:
	import ogr
except:
	try:
		from osgeo import ogr
	except: 
		print "Import of ogr failed."

# Import other needed modules
import os, sys, gdalconst, numpy

# User variables
study_area_path = "E:/Hayden_Elza/plots/test_data/extent.shp"
n = 1000
output_dir = "E:/Hayden_Elza/plots/output"

# Check if output folder exists
if not os.path.exists(output_dir):
	os.makedirs(output_dir)
else:
	print output_dir,"already exits. Cannot ouput results there."
	sys.exit(-1)


#--------------------
# Prepare Study Area
#--------------------

# Check if file exists
if not os.path.isfile(study_area_path):
	print "The specified file for the study area does not exist."

# Get appropriate driver
driver = ogr.GetDriverByName('ESRI Shapefile')

# Open the file using the driver
study_area = driver.Open(study_area_path, gdalconst.GA_ReadOnly)

# Verify if the file was opened, if not exit
if study_area is None:
	print "Failed to open file."
	sys.exit(-1)

# Get first layer
study_area_layer = study_area.GetLayer(0)

# Feature count
feature_count1 = study_area_layer.GetFeatureCount()
if feature_count1 > 1:
	print "This data set contains more than one feature. Please use a study area with a single feature."
	sys.exit(-1)

# Get extent
extent = study_area_layer.GetExtent()


#----------------
# Prepare Points
#----------------

# Create shapefile
plots_dst = driver.CreateDataSource(os.path.join(output_dir,"plots.shp"))
plots = plots_dst.CreateLayer('foolayer',geom_type=ogr.wkbPoint)

# Validate creation
if plots is None:
	print "Could not create plots layer."
	sys.exit(-1)

plots_def = plots.GetLayerDefn() # Every feature in layer will have this


#---------------
# Create Points
#---------------

# Create point geometry
point = ogr.Geometry(ogr.wkbPoint)

for i in range(0,n):
	x = numpy.random.uniform(min(extent[0],extent[1]),max(extent[0],extent[1]))
	y = numpy.random.uniform(min(extent[2],extent[3]),max(extent[2],extent[3]))
	point.AddPoint(x,y)  # Add geometry

	# Create pls_prime geometry and fields
	plots_feature = ogr.Feature(plots_def)  # Create empty feature
	plots_feature.SetGeometry(point)  # Create geometry
	plots_feature.SetFID(i)  # Set fid
	plots.CreateFeature(plots_feature)  # Add feature to layer

# Free Memory
plots = None
plots_feature = None
point = None
plots_def = None