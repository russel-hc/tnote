import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";

const handleGet = async ({ supabase, session, params }: ApiContext) => {
  const studentId = params?.id;

  const { data: student, error: studentError } = await supabase
    .from("Users")
    .select("id")
    .eq("id", studentId)
    .eq("workspace", session.workspace)
    .eq("role", "student")
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("StudentTagAssignments")
    .select(`
      id,
      student_id,
      tag_id,
      start_date,
      end_date,
      created_at,
      tag:StudentTags!inner(id, name, color, workspace)
    `)
    .eq("student_id", studentId)
    .eq("tag.workspace", session.workspace);

  if (error) throw error;
  return NextResponse.json({ data });
};

const handlePost = async ({ request, supabase, session, params }: ApiContext) => {
  const studentId = params?.id;
  const { tagId, startDate, endDate } = await request.json();

  if (!tagId) {
    return NextResponse.json({ error: "태그 ID는 필수입니다." }, { status: 400 });
  }

  if (!startDate) {
    return NextResponse.json({ error: "시작 날짜는 필수입니다." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabase
    .from("Users")
    .select("id")
    .eq("id", studentId)
    .eq("workspace", session.workspace)
    .eq("role", "student")
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: tag, error: tagError } = await supabase
    .from("StudentTags")
    .select("id")
    .eq("id", tagId)
    .eq("workspace", session.workspace)
    .single();

  if (tagError || !tag) {
    return NextResponse.json({ error: "태그를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("StudentTagAssignments")
    .insert({
      student_id: studentId,
      tag_id: tagId,
      start_date: startDate,
      end_date: endDate || null,
    })
    .select(`
      id,
      student_id,
      tag_id,
      start_date,
      end_date,
      created_at,
      tag:StudentTags(id, name, color)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 해당 태그가 할당되어 있습니다." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ success: true, data });
};

const handlePatch = async ({ request, supabase, session, params }: ApiContext) => {
  const studentId = params?.id;
  const { tagId, startDate, endDate } = await request.json();

  if (!tagId) {
    return NextResponse.json({ error: "태그 ID는 필수입니다." }, { status: 400 });
  }

  if (!startDate) {
    return NextResponse.json({ error: "시작 날짜는 필수입니다." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabase
    .from("Users")
    .select("id")
    .eq("id", studentId)
    .eq("workspace", session.workspace)
    .eq("role", "student")
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: tag, error: tagError } = await supabase
    .from("StudentTags")
    .select("id")
    .eq("id", tagId)
    .eq("workspace", session.workspace)
    .single();

  if (tagError || !tag) {
    return NextResponse.json({ error: "태그를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("StudentTagAssignments")
    .update({
      start_date: startDate,
      end_date: endDate || null,
    })
    .eq("student_id", studentId)
    .eq("tag_id", tagId)
    .select(`
      id,
      student_id,
      tag_id,
      start_date,
      end_date,
      created_at,
      tag:StudentTags(id, name, color)
    `)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "해당 태그 할당을 찾을 수 없습니다." }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ success: true, data });
};

const handleDelete = async ({ request, supabase, session, params }: ApiContext) => {
  const studentId = params?.id;
  const { tagId } = await request.json();

  if (!tagId) {
    return NextResponse.json({ error: "태그 ID는 필수입니다." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabase
    .from("Users")
    .select("id")
    .eq("id", studentId)
    .eq("workspace", session.workspace)
    .eq("role", "student")
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error } = await supabase
    .from("StudentTagAssignments")
    .delete()
    .eq("student_id", studentId)
    .eq("tag_id", tagId);

  if (error) throw error;
  return NextResponse.json({ success: true });
};

export const GET = withLogging(handleGet, {
  resource: "student-tags",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
export const POST = withLogging(handlePost, {
  resource: "student-tags",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
export const DELETE = withLogging(handleDelete, {
  resource: "student-tags",
  action: "delete",
  allowedRoles: ["owner", "admin"],
});
export const PATCH = withLogging(handlePatch, {
  resource: "student-tags",
  action: "update",
  allowedRoles: ["owner", "admin"],
});
