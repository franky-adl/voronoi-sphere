// hash function from https://github.com/MaxBittker/glsl-voronoi-noise
vec3 hash3d(vec3 p) {
  return fract(
      sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
               dot(p, vec3(113.0, 1.0, 57.0)))) *
      43758.5453);
}

// voronoi implementation largely referenced from https://www.shadertoy.com/view/MslGD8
vec2 voronoi( in vec3 x, in float time )
{
    // current cell coordinates
    vec3 n = floor(x);
    // pixel coordinates in current cell
    vec3 f = fract(x);

    // initialize m with a large number
    // (which will be get replaced very soon with smaller distances below)
    vec4 m = vec4(8.0);

    // in 2D voronoi, we only have 2 dimensions to loop over
    // in 3D, we would naturally have one more dimension to loop over
    for( int k=-1; k<=1; k++ ) {
        for( int j=-1; j<=1; j++ ) {
            for( int i=-1; i<=1; i++ )
            {
                // coordinates for the relative cell  within the 3x3x3 3D grid
                vec3 g = vec3(float(i),float(j),float(k));
                // calculate a random point within the cell relative to 'n'(current cell coordinates)
                vec3 o = hash3d( n + g );
                // calculate the distance vector between the current pixel and the moving random point 'o'
                vec3 r = g + (0.5+0.5*sin(vec3(time)+6.2831*o)) - f;
                // calculate the scalar distance of r
                float d = dot(r,r);

                // find the minimum distance
                // it is most important to save the minimum distance into the result 'm'
                // saving other information into 'm' is optional and up to your liking
                // e.g. displaying different colors according to various cell coordinates
                if( d<m.x )
                {
                    m = vec4( d, o );
                }
            }
        }
    }

    return vec2(m.x, m.y+m.z+m.w);
}

#pragma glslify: export(voronoi)