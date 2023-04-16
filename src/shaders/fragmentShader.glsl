#pragma glslify: voronoi = require('./voronoi3d_basic.glsl')

uniform float u_time;
uniform float u_bFactor;
uniform float u_pcurveHandle;
varying vec3 v_pos;

// Function from Iñigo Quiles
// www.iquilezles.org/www/articles/functions/functions.htm
// for visual demo, go to https://thebookofshaders.com/edit.php#05/pcurve.frag
float parabola( float x, float k ){
    return pow(4.*x*(1.-x), k);
}

// Function from Iñigo Quiles
// www.iquilezles.org/www/articles/functions/functions.htm
// for visual demo, go to https://thebookofshaders.com/edit.php#05/parabola.frag
float pcurve( float x, float a, float b ){
    float k = pow(a+b,a+b) / (pow(a,a)*pow(b,b));
    return k * pow( x, a ) * pow( 1.0-x, b );
}

void main() {
    vec2 res = voronoi(v_pos*3., u_time*0.3);
    // darken by pow
    vec3 mycolor = vec3(pow(res.x, 1.5));
    // emphasis on blue
    float blue = mycolor.b * u_bFactor;
    // cut off the blueness at the top end of the spectrum
    mycolor.b = blue * (1. - smoothstep(0.9,1.0,res.x));
    // adjust red+greeness using pcurve such that greyness/whiteness
    // is only seen at a limited range within the spectrum
    mycolor.r = pcurve(mycolor.r, 4.0, u_pcurveHandle);
    mycolor.g = pcurve(mycolor.g, 4.0, u_pcurveHandle);
    gl_FragColor = vec4( mycolor, 1.0 );
}