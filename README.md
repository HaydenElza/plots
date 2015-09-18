# Plots
#### shapefile + desired number of points in → sample plots out

Webapp at [sampleplotter.com](http://www.sampleplotter.com)

This is a small project to provide simple scripts to generate sample plots given an area of interest.

### Usage:

~~~
plots.py -s <sampletype> -i <inputfile> -o <outputfile> -n <numberofplots> {-t <checktopology> [default:True|False] -r <rotationindegrees> [defualt:0]}
~~~

~~~
  -h --help              Show this screen.
  -s --sample_type       Sample type.
  	                     (random_sample|systematic_grid|equidistant)
  -i --input_path        Path to input shapefile.
  -o --output_dir        Path to output directory.
  -n --plot_number       Target number of plots to generate.
  -t --check_topology    Only create points within study area.
  	                     [default: True|False]
  -r --rotation          Counter-clockwise rotation, in degrees,
  	                     of point array about center of extent. [default: 0]
~~~

### Sample Types:

| **Random** | **Systematic** | **Equidistant**  |
|---|---|---|
| ![](https://github.com/HaydenElza/plots/blob/master/examples/random_1000.png?raw=true) |  ![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000.png?raw=true)  |

| `sample_type` | Description |
---|:--
random | Randomly creates the specified number of points.
systematic | Given a target number of points (n), a systematic grid of points is created. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes.
equidistant | Given a number of points (n), a systematic triangular grid of points is created. Points are equidistant from each other. A between point distance (d) is calculated to get the total number of points as close to n as possible. Initial point is randomly chosen between 0 and d for both x and y axes.

### Check Topology:

If `--check_topology True`, as close to n points as possible will be created *only* within study area. Default `check_topology=True`.

| Random | Systematic | Equidistant |
|---|---|---|
![](https://github.com/HaydenElza/plots/blob/master/examples/random_1000_checktopology.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000_checktopology.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000_checktopology.png?raw=true)

### Rotation:

Rotation in degrees of point array in counter-clockwise direction about extent center. Defaut `rotation=0`. Examples using `--rotation -15`:

| Systematic | Equidistant |
|---|---|
![](https://github.com/HaydenElza/plots/blob/master/examples/systematic_1000_checktopology_-15rotation.png?raw=true) | ![](https://github.com/HaydenElza/plots/blob/master/examples/equidistant_1000_checktopology_-15rotation.png?raw=true)
