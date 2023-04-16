// from https://github.com/MaxBittker/glsl-voronoi-noise and https://www.shadertoy.com/view/MslGD8
vec3 hash3d(vec3 p) {
  return fract(
      sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
               dot(p, vec3(113.0, 1.0, 57.0)))) *
      43758.5453);
}

vec2 voronoi( in vec3 x, in float time )
{
    vec3 n = floor(x);
    vec3 f = fract(x);

    //----------------------------------
    // first pass: regular voronoi
    //----------------------------------
	vec3 mr;

    vec4 m = vec4(8.0);
    for( int k=-1; k<=1; k++ ) {
        for( int j=-1; j<=1; j++ ) {
            for( int i=-1; i<=1; i++ )
            {
                vec3 g = vec3(float(i),float(j),float(k));
                // o is the coordinates of the random point at current cell
                vec3 o = hash3d( n + g );
                vec3 r = g + (0.5+0.5*sin(vec3(time)+6.2831*o)) - f;
                float d = dot(r,r);

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