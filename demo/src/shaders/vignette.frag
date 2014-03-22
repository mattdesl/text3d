#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_texture0;

varying vec4 vColor;
varying vec2 vTexCoord0;

void main() {
	float dist = smoothstep(0.5, 0.35, length(vTexCoord0.xy - 0.5));
	gl_FragColor = vColor * texture2D(u_texture0, vTexCoord0);
	gl_FragColor.a *= dist;
}