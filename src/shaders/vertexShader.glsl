varying vec3 v_pos;

void main() {
    v_pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}