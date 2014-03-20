attribute vec4 Position;
attribute vec4 Color;
// attribute vec2 TexCoord0;

uniform mat4 u_projModelView;

varying vec4 v_col;
// varying vec2 v_texCoord0;

void main() {
	gl_Position = u_projModelView * vec4(Position.xyz, 1.0);
	v_col = Color;
	// v_texCoord0 = TexCoord0;
}